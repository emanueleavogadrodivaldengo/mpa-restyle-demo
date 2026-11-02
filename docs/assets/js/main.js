// MPA Style · l'unico JavaScript del sito. Tutto il resto (menu, scroll-reveal,
// cambio pagina animato) funziona con HTML e CSS. Se questo file non si carica,
// il sito si usa lo stesso: i caroselli si scorrono col dito o con la rotellina.

// Caroselli: le frecce scorrono di una card alla volta e si spengono alle estremità.
document.querySelectorAll('[data-carousel]').forEach(carousel => {
  const track = carousel.querySelector('.carousel__track');
  const nav = carousel.querySelector('.carousel__nav');
  const [prev, next] = nav.querySelectorAll('button');

  const step = () => track.firstElementChild.getBoundingClientRect().width + 16;
  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    nav.hidden = max <= 1; // tutto visibile: le frecce non servono
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max - 1;
  };

  nav.addEventListener('click', e => {
    const dir = Number(e.target.closest('button')?.dataset.dir);
    if (dir) track.scrollBy({ left: dir * step(), behavior: 'smooth' });
  });
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
});

// Carosello d'apertura ("in evidenza"). Scorre da solo ogni 6 secondi, ma con delle regole
// per non dare fastidio: parte solo se l'utente non ha chiesto "riduci movimento", si ferma
// quando il mouse o la tastiera sono sopra, quando la scheda non è visibile e, per sempre,
// appena l'utente lo usa (frecce, pallini, trascinamento). C'è anche un pulsante pausa.
document.querySelectorAll('[data-hero]').forEach(hero => {
  const track = hero.querySelector('.hero__track');
  const slides = [...track.children];
  const dotsBox = hero.querySelector('.hero__dots');
  const pauseBtn = hero.querySelector('.hero__pause');
  const DELAY = 6000;
  let timer = null;
  let stopped = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const current = () => Math.round(track.scrollLeft / track.clientWidth);
  const go = i => track.scrollTo({ left: ((i + slides.length) % slides.length) * track.clientWidth, behavior: 'smooth' });

  // Un pallino per notizia
  const dots = slides.map((slide, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Notizia ${i + 1} di ${slides.length}`);
    b.addEventListener('click', () => { stop(); go(i); });
    dotsBox.append(b);
    return b;
  });
  const update = () => dots.forEach((d, i) => d.setAttribute('aria-current', i === current()));

  const play = () => { if (!stopped && !timer) timer = setInterval(() => go(current() + 1), DELAY); };
  const pause = () => { clearInterval(timer); timer = null; };
  function stop() {
    stopped = true;
    pause();
    pauseBtn.hidden = true;
  }

  hero.querySelectorAll('[data-dir]').forEach(b =>
    b.addEventListener('click', () => { stop(); go(current() + Number(b.dataset.dir)); }));
  pauseBtn.addEventListener('click', stop);
  track.addEventListener('pointerdown', stop);
  track.addEventListener('scroll', update, { passive: true });
  hero.addEventListener('mouseenter', pause);
  hero.addEventListener('mouseleave', play);
  hero.addEventListener('focusin', pause);
  hero.addEventListener('focusout', play);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));

  update();
  if (!stopped && slides.length > 1) { pauseBtn.hidden = false; play(); }
});

// Pagina "Cerca" (solo nella demo: sul sito vero la ricerca la fa WordPress, in search.php).
// Le notizie sono già tutte nella pagina; qui mostriamo quelle che contengono TUTTE le parole
// cercate, ignorando maiuscole e accenti ("citta" trova "città"), e evidenziamo le parole trovate.
document.querySelectorAll('[data-search-page]').forEach(page => {
  const q = (new URLSearchParams(location.search).get('s') ?? '').trim();
  const title = page.querySelector('[data-search-title]');
  const status = page.querySelector('[data-search-status]');
  const results = page.querySelector('[data-search-results]');
  const empty = page.querySelector('[data-search-empty]');
  const tips = page.querySelector('[data-search-tips]');
  const cards = [...results.children];

  // Anche la casella nell'header mostra la parola cercata
  document.querySelectorAll('input[name="s"]').forEach(i => { i.value = q; });
  if (!q) return; // nessuna parola: resta la pagina con la casella e le ricerche frequenti

  // Toglie accenti e maiuscole, una lettera alla volta, ricordando dove sta ogni lettera
  // nel testo originale (serve per evidenziare il punto giusto)
  const plain = c => c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const fold = text => {
    let out = '';
    const pos = [];
    [...text].forEach((c, i) => { const p = plain(c); out += p; for (let k = 0; k < p.length; k++) pos.push(i); });
    return { out, pos };
  };
  // Le parole lunghe perdono l'ultima vocale: "calzature" trova anche "calzaturiero",
  // "pelli" trova "pelle". Le parole di una o due lettere ("di", "e") non contano.
  // Le parole valgono solo a inizio parola: "arte" non trova "partecipare"
  const isLetter = c => /[\p{L}\p{N}]/u.test(c ?? '');
  const findAll = (text, w) => {
    const found = [];
    for (let i = text.indexOf(w); i !== -1; i = text.indexOf(w, i + 1)) {
      if (!isLetter(text[i - 1])) found.push(i);
    }
    return found;
  };
  const words = [...new Set(plain(q).split(/[^\p{L}\p{N}]+/u)
    .filter(w => w.length > 2)
    .map(w => (w.length > 4 ? w.replace(/[aeiou]$/, '') : w)))];

  const show = (heading, message) => {
    title.textContent = heading;
    status.textContent = message;
    document.title = `${q} · Cerca nel sito · MPA Style`;
  };

  if (!words.length) {
    show('Cerca', 'Scrivi una parola di almeno tre lettere.');
    return;
  }

  const scored = cards.map(card => {
    const titleText = fold(card.querySelector('.card__title').textContent).out;
    const rest = fold(card.textContent).out;
    const ok = words.every(w => findAll(rest, w).length);
    // Prima le notizie che hanno le parole nel titolo, poi le altre (a parità, la più recente)
    return { card, ok, score: words.filter(w => findAll(titleText, w).length).length };
  }).filter(r => r.ok).sort((a, b) => b.score - a.score);

  cards.forEach(c => { c.hidden = true; });
  scored.forEach(({ card }) => { card.hidden = false; results.append(card); });
  results.querySelectorAll('.card__title, .card__excerpt').forEach(el => highlight(el, words));

  const n = scored.length;
  show('Risultati della ricerca',
    n ? `${n === 1 ? 'Una notizia trovata' : `${n} notizie trovate`} per «${q}».`
      : `Per «${q}» non abbiamo trovato notizie.`);
  results.hidden = !n;
  empty.hidden = !!n;
  tips.hidden = !!n;

  // Avvolge in <mark> le parole trovate, senza toccare l'HTML della card
  function highlight(el, list) {
    const text = el.textContent;
    const { out, pos } = fold(text);
    const ranges = [];
    for (const w of list) {
      for (const i of findAll(out, w)) ranges.push([pos[i], pos[i + w.length - 1] + 1]);
    }
    if (!ranges.length) return;
    ranges.sort((a, b) => a[0] - b[0]);
    const chars = [...text];
    el.textContent = '';
    let at = 0;
    for (const [from, to] of ranges) {
      if (from < at) continue; // si sovrappone a una parola già evidenziata
      // Evidenzia la parola intera: "calzatur" → "calzaturiero"
      let end = to;
      while (end < chars.length && isLetter(chars[end])) end++;
      el.append(chars.slice(at, from).join(''));
      const mark = document.createElement('mark');
      mark.textContent = chars.slice(from, end).join('');
      el.append(mark);
      at = end;
    }
    el.append(chars.slice(at).join(''));
  }
});
