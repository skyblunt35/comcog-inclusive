
(function () {
  var root = document.documentElement;
  /* Si une erreur survient, on retire .js : plus aucun titre ne peut rester masqué. */
  window.addEventListener('error', function () { root.classList.remove('js'); });
  var calm = function () {
    return root.getAttribute('data-motion') === 'calm' ||
      (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  var LANGS = ['fr', 'en', 'es'];
  var MOTION = {fr:{off:"Réduire les animations",on:"Réactiver les animations"},en:{off:"Reduce animations",on:"Re-enable animations"},es:{off:"Reducir las animaciones",on:"Reactivar las animaciones"}};
  var TITLES = {fr:"ComCog Inclusive, communication et cognition à Saint-Malo",en:"ComCog Inclusive, communication and cognition in Saint-Malo",es:"ComCog Inclusive, comunicación y cognición en Saint-Malo"};
  var NAVS = {fr:"Navigation principale",en:"Main navigation",es:"Navegación principal"};
  var btnMotion = document.getElementById('motion-toggle');
  function lang() { return root.getAttribute('data-lang') || 'fr'; }
  window.comcogLang = lang;
  function syncMotion() {
    var calm = root.getAttribute('data-motion') === 'calm';
    btnMotion.textContent = calm ? MOTION[lang()].on : MOTION[lang()].off;
  }
  function setLang(l) {
    if (LANGS.indexOf(l) < 0) l = 'fr';
    root.setAttribute('data-lang', l);
    root.setAttribute('lang', l);
    document.title = TITLES[l];
    var nv = document.querySelector('.nav'); if (nv) nv.setAttribute('aria-label', NAVS[l]);
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang') === l ? 'true' : 'false');
    });
    try { localStorage.setItem('comcog-lang', l); } catch (e) {}
    syncMotion();
    document.dispatchEvent(new CustomEvent('comcog:lang', { detail: l }));
  }
  document.querySelectorAll('.lang button').forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
  });
  setLang(lang());
  btnMotion.addEventListener('click', function () {
    var calm = root.getAttribute('data-motion') === 'calm';
    if (calm) root.removeAttribute('data-motion'); else root.setAttribute('data-motion', 'calm');
    try { localStorage.setItem('comcog-motion', calm ? 'full' : 'calm'); } catch (e) {}
    syncMotion();
    document.dispatchEvent(new CustomEvent('comcog:motion'));
  });
  syncMotion();

  /* 1. Entrée : le titre se révèle, le trait balaie. */
  document.querySelectorAll('.hero .wipe[data-wipe-delay]').forEach(function (el) {
    setTimeout(function () { el.classList.add('seen'); }, +el.getAttribute('data-wipe-delay'));
  });

  /* 2. Titres de section : révélés par balayage quand ils entrent dans le regard, à leur place. */
  var wipes = Array.prototype.slice.call(document.querySelectorAll('.wipe:not(.seen):not([data-wipe-delay])'));
  function revealWipes() {
    var limit = window.innerHeight * .92;
    wipes = wipes.filter(function (w) {
      if (w.getBoundingClientRect().top < limit) { w.classList.add('seen'); return false; }
      return true;
    });
  }

  /* 3. Le fil se dessine avec le défilement, à partir du bloc blanc, jusqu'à la hauteur
        du regard. Chaque nœud s'allume quand le fil l'atteint. Rien ne bouge sans le visiteur. */
  var track = document.querySelector('.track');
  var fill = document.getElementById('spine');
  var nodes = Array.prototype.slice.call(document.querySelectorAll('.node'));
  var ticking = false;
  function draw() {
    ticking = false;
    revealWipes();
    var r = track.getBoundingClientRect();
    var top = r.top + window.pageYOffset, h = r.height;
    var eye = window.pageYOffset + window.innerHeight * .58;
    var p = calm() ? 1 : Math.min(1, Math.max(0, (eye - top) / h));
    fill.style.transform = 'scaleY(' + p + ')';
    var reach = top + p * h;
    nodes.forEach(function (n) {
      var nt = n.getBoundingClientRect().top + window.pageYOffset + 9;
      n.classList.toggle('lit', calm() || nt <= reach);
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(draw); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);
  document.addEventListener('comcog:motion', draw);
  draw();

  /* 4. Un mot du héros change lentement, dans la langue affichée : ce que l'on aide à
        continuer à faire. La suite de la phrase est à la ligne, donc rien ne se déplace. Deux tours, puis il se pose.
        En pause au survol, jamais en mouvement réduit. */
  var WORDS = {fr:["communiquer","se souvenir","s'orienter","se concentrer","participer"],en:["communicating","remembering","finding their way","focusing","taking part"],es:["comunicándose","recordando","orientándose","concentrándose","participando"]};
  var cyc = document.getElementById('cycle');
  var i = 0, turns = 0, paused = false, timer = null;
  function words() { return WORDS[window.comcogLang ? window.comcogLang() : 'fr']; }
  var swap = null;
  function show(k) { cyc.textContent = words()[k] + ','; }
  function next() {
    if (calm()) return;
    if (paused) { timer = setTimeout(next, 800); return; }
    cyc.classList.add('is-out');
    swap = setTimeout(function () {
      i = (i + 1) % words().length;
      if (i === 0) turns++;
      show(i);
      cyc.classList.remove('is-out');
      if (turns >= 2 && i === 0) return;
      timer = setTimeout(next, 2600);
    }, 380);
  }
  function restart() {
    clearTimeout(timer); clearTimeout(swap);
    cyc.classList.remove('is-out');
    i = 0; turns = 0; show(0);
    if (!calm()) timer = setTimeout(next, 3200);
  }
  restart();
  document.addEventListener('comcog:lang', restart);
  document.addEventListener('comcog:motion', restart);
  var hero = document.querySelector('.hero');
  hero.addEventListener('mouseenter', function () { paused = true; });
  hero.addEventListener('mouseleave', function () { paused = false; });
})();
