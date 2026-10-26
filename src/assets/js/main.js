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
