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
