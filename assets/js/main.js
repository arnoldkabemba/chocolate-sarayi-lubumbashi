/* ==========================================================================
   Chocolate Sarayı — scripts. Aucune dépendance.
   Volontairement sobre : pas d'effet de frappe, pas de compteurs animés.
   ========================================================================== */
(function () {
  'use strict';

  /* ---- Horaires ----------------------------------------------------------
     ATTENTION : la fiche Google de l'établissement ne publie aucun horaire.
     Les valeurs ci-dessous sont PROVISOIRES et signalées « à confirmer »
     sur les pages. À remplacer par les horaires réels avant mise en ligne.
     Index 0 = dimanche, conforme à Date.getDay().                           */
  var HORAIRES = [
    { ouv: 9 * 60, fer: 22 * 60 },  // dimanche
    { ouv: 8 * 60, fer: 22 * 60 },  // lundi
    { ouv: 8 * 60, fer: 22 * 60 },
    { ouv: 8 * 60, fer: 22 * 60 },
    { ouv: 8 * 60, fer: 22 * 60 },
    { ouv: 8 * 60, fer: 23 * 60 },  // vendredi
    { ouv: 9 * 60, fer: 23 * 60 }   // samedi
  ];

  /* Heure locale de Lubumbashi (UTC+2, sans changement d'heure) */
  function maintenant() {
    var d = new Date();
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000 + 2 * 3600000);
  }
  function dd(n) { return (n < 10 ? '0' : '') + n; }
  function heure(min) { var m = min % 1440; return dd(Math.floor(m / 60)) + 'h' + dd(m % 60); }

  function etat() {
    var d = maintenant(), jour = d.getDay(), min = d.getHours() * 60 + d.getMinutes();
    var veille = HORAIRES[(jour + 6) % 7];
    if (veille.fer > 1440 && min < veille.fer - 1440) return { ouvert: true, fer: veille.fer - 1440, jour: jour };
    var auj = HORAIRES[jour];
    if (min >= auj.ouv && min < Math.min(auj.fer, 1440)) return { ouvert: true, fer: auj.fer, jour: jour };
    var dec = min < auj.ouv ? 0 : 1;
    return { ouvert: false, ouv: HORAIRES[(jour + dec) % 7].ouv, quand: dec ? 'demain' : 'aujourd’hui', jour: jour };
  }

  function majEtat() {
    var e = etat();
    document.querySelectorAll('[data-etat]').forEach(function (el) {
      el.textContent = e.ouvert
        ? 'Ouvert jusqu’à ' + heure(e.fer)
        : 'Fermé · ouvre ' + e.quand + ' à ' + heure(e.ouv);
    });
    document.querySelectorAll('.horaires tr[data-jour]').forEach(function (tr) {
      var jours = tr.dataset.jour.split(/\s+/).map(Number);
      tr.classList.toggle('aujourdhui', jours.indexOf(e.jour) !== -1);
    });
  }

  /* ---- Navigation --------------------------------------------------------- */
  function nav() {
    var burger = document.querySelector('.burger');
    if (!burger) return;
    function bascule(force) {
      var o = force !== undefined ? force : !document.body.classList.contains('nav-ouverte');
      document.body.classList.toggle('nav-ouverte', o);
      burger.setAttribute('aria-expanded', String(o));
    }
    burger.addEventListener('click', function () { bascule(); });
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { bascule(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') bascule(false); });
  }

  /* ---- En-tête : transparente sur la photo, posée ensuite ------------------ */
  function entete() {
    var el = document.querySelector('.entete');
    if (!el) return;
    // Sans photo d'ouverture, il n'y a pas de fond sombre derrière l'en-tête :
    // il doit rester opaque en permanence, sinon le texte crème devient
    // invisible sur le papier crème.
    if (!document.querySelector('.ouverture')) { el.classList.add('entete--posee'); return; }
    var seuil = window.innerHeight * 0.72;
    var tick = false;
    function maj() { el.classList.toggle('entete--posee', window.scrollY > seuil); }
    window.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { maj(); tick = false; });
    }, { passive: true });
    window.addEventListener('resize', function () {
      seuil = document.querySelector('.ouverture') ? window.innerHeight * 0.72 : 40;
      maj();
    });
    maj();  // une page ouverte sur une ancre démarre déjà défilée
  }

  /* ---- Apparitions -------------------------------------------------------- */
  function apparitions() {
    var cibles = document.querySelectorAll('.monte, .devoile, .suite');
    if (!cibles.length) return;
    if (!('IntersectionObserver' in window)) {
      cibles.forEach(function (e) { e.classList.add('vu'); });
      return;
    }
    // Seuil à 0 : un conteneur plus haut que l'écran (la planche de la galerie)
    // n'atteindrait jamais un seuil en pourcentage et resterait invisible.
    var obs = new IntersectionObserver(function (ent) {
      ent.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('vu'); obs.unobserve(e.target); }
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    cibles.forEach(function (e) { obs.observe(e); });
  }

  /* ---- Sommaire de la carte ----------------------------------------------- */
  function sommaire() {
    var liens = document.querySelectorAll('.menu-nav a');
    if (!liens.length) return;
    var paires = [];
    liens.forEach(function (a) {
      var s = document.querySelector(a.getAttribute('href'));
      if (s) paires.push({ a: a, s: s });
    });
    if (!paires.length) return;
    var obs = new IntersectionObserver(function (ent) {
      ent.forEach(function (e) {
        if (!e.isIntersecting) return;
        liens.forEach(function (x) { x.classList.remove('actif'); });
        var t = paires.filter(function (p) { return p.s === e.target; })[0];
        if (t) {
          t.a.classList.add('actif');
          t.a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    paires.forEach(function (p) { obs.observe(p.s); });
  }

  /* ---- Galerie ------------------------------------------------------------ */
  function galerie() {
    var planche = document.querySelector('.planche');
    var figures = planche ? Array.prototype.slice.call(planche.querySelectorAll('figure')) : [];

    document.querySelectorAll('.filtres button').forEach(function (b, _, tous) {
      b.addEventListener('click', function () {
        var cat = b.dataset.filtre;
        tous.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        figures.forEach(function (f) { f.hidden = cat !== 'tout' && f.dataset.cat !== cat; });
      });
    });

    var vue = document.querySelector('.visionneuse');
    if (!vue || !figures.length) return;
    var img = vue.querySelector('img');
    var cpt = vue.querySelector('.visionneuse__cpt');
    var src = [], i = 0;

    function collecte() {
      src = [];
      figures.forEach(function (f) {
        if (f.hidden) return;
        var im = f.querySelector('img');
        // im.src, et surtout pas im.currentSrc : depuis que les photos ont un
        // srcset, currentSrc est la petite copie choisie pour la vignette
        // (480 px). La visionneuse l'afficherait en plein écran, floue.
        // L'attribut src reste, lui, la photo d'origine.
        if (im) src.push({ s: im.src, a: im.alt });
      });
    }
    function montre(n) {
      if (!src.length) return;
      i = (n + src.length) % src.length;
      img.src = src[i].s; img.alt = src[i].a;
      if (cpt) cpt.textContent = (i + 1) + ' / ' + src.length;
    }
    function ferme() { vue.classList.remove('actif'); document.body.style.overflow = ''; }

    figures.forEach(function (f) {
      f.addEventListener('click', function () {
        collecte();
        montre(figures.filter(function (x) { return !x.hidden; }).indexOf(f));
        vue.classList.add('actif');
        document.body.style.overflow = 'hidden';
      });
    });
    vue.querySelector('.visionneuse__fermer').addEventListener('click', ferme);
    vue.querySelector('.visionneuse__prec').addEventListener('click', function () { montre(i - 1); });
    vue.querySelector('.visionneuse__suiv').addEventListener('click', function () { montre(i + 1); });
    vue.addEventListener('click', function (e) { if (e.target === vue) ferme(); });
    document.addEventListener('keydown', function (e) {
      if (!vue.classList.contains('actif')) return;
      if (e.key === 'Escape') ferme();
      if (e.key === 'ArrowLeft') montre(i - 1);
      if (e.key === 'ArrowRight') montre(i + 1);
    });
  }

  /* ---- Formulaire : départ vers WhatsApp ---------------------------------- */
  function formulaire() {
    document.querySelectorAll('form[data-whatsapp]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = new FormData(f);
        var l = [f.dataset.objet || 'Message depuis le site', ''];
        f.querySelectorAll('[name]').forEach(function (c) {
          var v = (d.get(c.name) || '').toString().trim();
          if (!v) return;
          var lab = f.querySelector('label[for="' + c.id + '"]');
          l.push((lab ? lab.textContent.trim() : c.name) + ' : ' + v);
        });
        window.open('https://wa.me/' + f.dataset.whatsapp + '?text=' + encodeURIComponent(l.join('\n')), '_blank', 'noopener');
        var m = f.querySelector('.formulaire__msg');
        if (m) m.classList.add('actif');
        f.reset();
      });
    });
  }

  function annee() {
    document.querySelectorAll('[data-annee]').forEach(function (e) {
      e.textContent = String(new Date().getFullYear());
    });
  }

  function init() {
    majEtat();
    setInterval(majEtat, 60000);
    nav(); entete(); apparitions(); sommaire(); galerie(); formulaire(); annee();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
