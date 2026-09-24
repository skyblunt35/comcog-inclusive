
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

(function () {
  /* Le nœud qui se desserre. La progression (0 emmêlé, 1 démêlé) est une fonction pure de la position
     de l'illustration dans la fenêtre. Chaque fil porte trois états : data-d0 (emmêlé), data-d1 (boucles
     resserrées à un point, le reste à mi-chemin) et d (démêlé). Sans script, en mouvement réduit ou en
     mode calme, l'état démêlé du balisage reste tel quel. */
  var svg = document.getElementById('fils-noeud');
  if (!svg) return;
  var SEUIL = 0.55; /* progression où les boucles ont disparu (état data-d1) ; même valeur dans le générateur */
  var fils = [], els = svg.querySelectorAll('path[data-d0]'), i, a, m, b;
  function nombres(s) { return s.match(/-?\d*\.?\d+/g).map(Number); }
  for (i = 0; i < els.length; i++) {
    a = nombres(els[i].getAttribute('data-d0')); b = nombres(els[i].getAttribute('d'));
    m = els[i].getAttribute('data-d1'); m = m === null ? null : nombres(m);
    if (a.length !== b.length || (m && m.length !== b.length)) return; /* balisage altéré : on laisse l'état démêlé */
    fils.push({ el: els[i], a: a, m: m, b: b });
  }
  var dessine = -1;
  function rendre(g) {
    if (g === dessine) return;
    dessine = g;
    /* Rythme quadratique par étape, continu en vitesse au seuil : les boucles restent rondes puis s'effacent vite. */
    var u, tA, tB, e, k, j, fil, de, vers, t, v;
    if (g < SEUIL) { u = g / SEUIL; tA = u * u; tB = 0; e = SEUIL * tA; }
    else { u = (g - SEUIL) / (1 - SEUIL); tA = 1; tB = 1 - (1 - u) * (1 - u); e = SEUIL + (1 - SEUIL) * tB; }
    for (k = 0; k < fils.length; k++) {
      fil = fils[k];
      if (!fil.m) { de = fil.a; vers = fil.b; t = e; }
      else if (g < SEUIL) { de = fil.a; vers = fil.m; t = tA; }
      else { de = fil.m; vers = fil.b; t = tB; }
      v = [];
      for (j = 0; j < de.length; j++) v.push(Math.round((de[j] + (vers[j] - de[j]) * t) * 10) / 10);
      fil.el.setAttribute('d', 'M' + v[0] + ' ' + v[1] + 'C' + v.slice(2).join(' '));
    }
  }
  var force = svg.getAttribute('data-p'); if (force !== null) { rendre(Math.min(1, Math.max(0, +force))); return; } /* tests */

  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  function calme() { return mq.matches || document.documentElement.getAttribute('data-motion') === 'calm'; }
  /* 0 tant que l'illustration n'est pas entrée par le bas (ou en haut de page si elle y est déjà visible),
     1 quand son bord haut atteint 15 % de la hauteur de la fenêtre. Réversible. */
  function progression() {
    var y = window.pageYOffset, vh = window.innerHeight, haut = svg.getBoundingClientRect().top + y;
    var debut = Math.max(0, haut - vh), fin = Math.max(debut + 1, haut - vh * 0.15), p = (y - debut) / (fin - debut);
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }
  var actuel = 1, cible = 1, prevu = false, enCalme = null;
  function cadre() {
    prevu = false;
    if (enCalme) return;
    cible = progression();
    var d = cible - actuel;
    if (Math.abs(d) < 0.002) actuel = cible; else actuel += d * 0.14; /* lissage ; arrêt net, aucun cadre au repos */
    rendre(actuel);
    if (actuel !== cible) demander();
  }
  function demander() { if (!prevu) { prevu = true; window.requestAnimationFrame(cadre); } }
  function ecouter(oui) {
    var f = oui ? 'addEventListener' : 'removeEventListener';
    window[f]('scroll', demander, { passive: true });
    window[f]('resize', demander, { passive: true });
  }
  /* Mode calme : état démêlé fixe, plus d'écouteurs. Retour : recalage instantané, sans transition. */
  function bascule() {
    var c = calme();
    if (c === enCalme) return;
    enCalme = c;
    ecouter(!c);
    actuel = cible = c ? 1 : progression();
    rendre(actuel);
  }
  document.addEventListener('comcog:motion', bascule);
  if (mq.addEventListener) mq.addEventListener('change', bascule); else if (mq.addListener) mq.addListener(bascule);
  window.addEventListener('load', demander); /* la mise en page peut bouger après le chargement des polices */
  bascule();
})();
