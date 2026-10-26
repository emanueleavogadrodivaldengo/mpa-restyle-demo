// Scarica dal sito attuale le ultime news con la loro foto, usando l'API di WordPress
// (ogni sito WordPress ha un indirizzo /wp-json/ che restituisce i contenuti in JSON).
// Uso, dalla cartella del progetto:  node scripts/scarica-news.mjs 20
// Salva le foto in src/assets/img/news/ e i dati in scripts/news-dal-sito.json,
// da cui poi si aggiorna src/data/news.json.

import { writeFileSync, mkdirSync } from 'node:fs';
import { extname } from 'node:path';

const SITO = 'https://www.mpastyle.it';
const QUANTE = Number(process.argv[2] ?? 20);
const CARTELLA_FOTO = 'src/assets/img/news';

// Toglie i tag HTML e decodifica le entità più comuni (&amp; &#8217; ...)
const testo = html => html
  .replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
  .replace(/\[&hellip;\]|&hellip;/g, '…')
  .trim();

const url = `${SITO}/wp-json/wp/v2/posts?per_page=${QUANTE}&_embed=wp:featuredmedia,wp:term`;
console.log('Leggo', url);
const risposta = await fetch(url);
if (!risposta.ok) throw new Error(`Il sito ha risposto ${risposta.status}`);
const articoli = await risposta.json();

mkdirSync(CARTELLA_FOTO, { recursive: true });
const risultato = [];

for (const a of articoli) {
  const media = a._embedded?.['wp:featuredmedia']?.[0];
  // Prendiamo la versione "large" (circa 1024 px) se c'è, altrimenti l'originale
  const sizes = media?.media_details?.sizes ?? {};
  const foto = (sizes.large ?? sizes.medium_large ?? sizes.full)?.source_url ?? media?.source_url;
  let file = null;
  if (foto) {
    file = `${a.slug}${extname(new URL(foto).pathname) || '.jpg'}`;
    const img = await fetch(foto);
    writeFileSync(`${CARTELLA_FOTO}/${file}`, Buffer.from(await img.arrayBuffer()));
  }
  const categorie = (a._embedded?.['wp:term']?.[0] ?? []).map(c => c.name);
  risultato.push({
    slug: a.slug,
    title: testo(a.title.rendered),
    date: a.date.slice(0, 10),
    categories: categorie,
    excerpt: testo(a.excerpt.rendered),
    image: file ? `news/${file}` : null,
    imageAlt: media?.alt_text ?? '',
  });
  console.log(file ? '✓' : '–', a.date.slice(0, 10), testo(a.title.rendered).slice(0, 70));
}

writeFileSync('scripts/news-dal-sito.json', JSON.stringify(risultato, null, 2) + '\n');
console.log(`\nFatto: ${risultato.length} news. Dati in scripts/news-dal-sito.json, foto in ${CARTELLA_FOTO}/`);
