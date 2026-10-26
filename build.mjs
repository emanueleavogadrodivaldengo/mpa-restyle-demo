// Costruisce il sito statico: legge src/, scrive docs/ (la cartella che GitHub Pages pubblica).
// Nessuna dipendenza: solo Node.js. Uso: node build.mjs
//
// Il "linguaggio" dei modelli è minimo e ricalca WordPress:
//   {{> header}}                         → get_header() / get_template_part()
//   {{#news template="card-news" limit=6}} → il "loop" di WP_Query
//   {{#riviste template="cover"}}         → un loop sulle sei testate
//   {{title}}, {{root}} ...               → variabili (in PHP: the_title(), ecc.)

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';

const SRC = 'src';
const OUT = 'docs';

const news = JSON.parse(readFileSync(join(SRC, 'data/news.json'), 'utf8'))
  .sort((a, b) => b.date.localeCompare(a.date));
const riviste = JSON.parse(readFileSync(join(SRC, 'data/riviste.json'), 'utf8'));
const rivistaByKey = Object.fromEntries(riviste.map(r => [r.key, r]));

const partial = name => readFileSync(join(SRC, 'partials', `${name}.html`), 'utf8');

const escape = s => String(s)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const dateHuman = iso => new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
  .format(new Date(iso + 'T12:00:00'));

// Legge gli attributi di una direttiva: limit=6 magazine="tannery" → { limit: '6', magazine: 'tannery' }
const parseAttrs = str => Object.fromEntries(
  [...str.matchAll(/([\w-]+)=(?:"([^"]*)"|(\S+))/g)].map(m => [m[1], m[2] ?? m[3]])
);

// Sostituisce {{nome}} con il valore (già "escapato"); {{{nome}}} lo inserisce così com'è.
// {{#if nome}}...{{else}}...{{/if}} sceglie un ramo, come un if in PHP (non annidabile).
const fill = (tpl, vars) => tpl
  .replace(/\{\{#if (\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g,
    (_, k, yes, no = '') => (vars[k] ? yes : no))
  .replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => vars[k] ?? '')
  .replace(/\{\{(\w+)\}\}/g, (_, k) => (k in vars ? escape(vars[k]) : `{{${k}}}`));

function newsVars(item, root) {
  const r = rivistaByKey[item.magazine];
  return {
    root,
    slug: item.slug,
    url: `${root}${item.slug}/`,
    title: item.title,
    excerpt: item.excerpt,
    date_iso: item.date,
    date_human: dateHuman(item.date),
    magazine_key: r.key,
    magazine_name: r.name,
    magazine_short: r.short,
    magazine_url: `${root}magazines/${r.slug}/`,
    // Foto vera se c'è, altrimenti il segnaposto (in WP: has_post_thumbnail())
    image: item.image ? `${root}assets/img/${item.image}` : '',
    image_alt: item.imageAlt ?? '',
  };
}

function renderNews(attrs, root) {
  let list = news;
  if (attrs.magazine) list = list.filter(n => n.magazine === attrs.magazine);
  if (attrs.exclude) list = list.filter(n => n.slug !== attrs.exclude);
  const offset = Number(attrs.offset ?? 0);
  const limit = Number(attrs.limit ?? list.length);
  const revealFrom = Number(attrs['reveal-from'] ?? Infinity);
  const tpl = partial(attrs.template ?? 'card-news');
  return list.slice(offset, offset + limit)
    .map((item, i) => fill(tpl, { ...newsVars(item, root), n: i + 1, reveal: i >= revealFrom ? 'reveal' : '' }))
    .join('\n');
}

function renderRiviste(attrs, root) {
  const tpl = partial(attrs.template ?? 'cover');
  const list = attrs.only ? riviste.filter(r => r.key === attrs.only) : riviste;
  return list.map(r => fill(tpl, {
    root,
    key: r.key,
    name: r.name,
    audience: r.audience,
    issue: r.issue,
    cover: r.cover ? `${root}assets/img/${r.cover}` : '',
    frequency: r.frequency ?? '',
    language: r.language ?? '',
    url: `${root}magazines/${r.slug}/`,
  })).join('\n');
}

// Pagine di sola lettura dei dati della testata: {{rivista_name}} ecc. dentro magazines/<slug>/
function rivistaVars(key) {
  const r = rivistaByKey[key];
  if (!r) return {};
  return { rivista_key: r.key, rivista_name: r.name, rivista_audience: r.audience, rivista_about: r.about, rivista_issue: r.issue, rivista_frequency: r.frequency ?? '', rivista_language: r.language ?? '' };
}

function renderPage(file) {
  const rel = relative(join(SRC, 'pages'), file);
  let html = readFileSync(file, 'utf8');
  // Prima riga: <!--page { ...JSON... } --> con titolo, descrizione e voce di menu attiva
  const meta = JSON.parse(html.match(/^<!--page\s*([\s\S]*?)-->/)[1]);
  html = html.replace(/^<!--page[\s\S]*?-->\s*/, '');

  // Percorso relativo verso la radice del sito (./ oppure ../../), così la demo funziona
  // sia aprendo i file dal disco sia su GitHub Pages. La 404 può fissarlo a mano.
  const depth = rel.split(sep).length - 1;
  const root = meta.root ?? (depth === 0 ? './' : '../'.repeat(depth));

  const vars = {
    root,
    title: meta.title,
    description: meta.description,
    section: meta.section ?? '',
    path: rel.replace(/index\.html$/, '').split(sep).join('/'),
    ...rivistaVars(meta.rivista),
  };

  // 1. inclusioni dei blocchi (anche annidate di un livello: l'header può includere altri blocchi)
  for (let i = 0; i < 2; i++) html = html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => partial(name));
  // 2. loop
  html = html
    .replace(/\{\{#news\s*([^}]*)\}\}/g, (_, a) => renderNews({ magazine: meta.rivista, ...parseAttrs(a) }, root))
    .replace(/\{\{#riviste\s*([^}]*)\}\}/g, (_, a) => renderRiviste(parseAttrs(a), root));
  // 3. variabili
  html = fill(html, vars);
  // 4. voce di menu attiva: aria-current="page" sul link con data-section uguale a quella della pagina
  for (const key of [vars.section, meta.rivista].filter(Boolean)) {
    html = html.replaceAll(`data-section="${key}"`, `data-section="${key}" aria-current="page"`);
  }

  const dest = join(OUT, rel);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
  return rel;
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : [];
  });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'assets'), join(OUT, 'assets'), { recursive: true });
const built = walk(join(SRC, 'pages')).map(renderPage);
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`Generate ${built.length} pagine in ${OUT}/:\n  ` + built.join('\n  '));
