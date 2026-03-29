/**
 * EdoTec Vehicle Widget
 * Adaugă un banner slim sub header cu mașina selectată de client.
 * Utilizare: <script src="https://configurator.edotec.ro/widget.js"></script>
 *
 * Sincronizare cross-subdomain:
 * - Same-origin (test local / dacă site-ul și configuratorul sunt pe același domeniu): localStorage direct
 * - Cross-origin (edotec.ro ↔ configurator.edotec.ro): postMessage când configuratorul e deschis ca popup
 * - Redirect pattern: configuratorul poate redirecționa la edotec.ro?edotec_vehicle=<json encodat>
 */
(function () {
  'use strict';

  var WIDGET_ID = 'edotec-vehicle-widget';
  var STORAGE_KEY = 'edotec_vehicle';
  var CONFIGURATOR_URL = 'https://configurator.edotec.ro/auto/';
  var CONFIGURATOR_ORIGIN = 'https://configurator.edotec.ro';
  var WIDGET_HEIGHT = 44; // px

  /* ─── Utilități ───────────────────────────────────────────────── */
  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getVehicle() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveVehicle(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { /* storage full / private mode */ }
  }

  function removeVehicle() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  /* ─── Detectare header edotec.ro ─────────────────────────────── */
  function getHeaderBottom() {
    var selectors = [
      '#header',
      '.site-header',
      'header.header',
      '#masthead',
      '.header-wrapper',
      '.navbar',
      '.nav-header',
      'header[role="banner"]',
      'header'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) {
        var rect = el.getBoundingClientRect();
        // Verifică că e un header real: lățime mare, aproape de top
        if (rect.width > window.innerWidth * 0.5 && rect.top >= -10 && rect.top < 200 && rect.height > 20) {
          return Math.round(rect.bottom);
        }
      }
    }
    return 0;
  }

  /* ─── Spacer pentru a nu acoperi conținut ─────────────────────── */
  function ensureSpacer() {
    var existing = document.getElementById(WIDGET_ID + '-spacer');
    if (!existing) {
      var spacer = document.createElement('div');
      spacer.id = WIDGET_ID + '-spacer';
      spacer.style.cssText = 'height:' + WIDGET_HEIGHT + 'px;width:100%;display:block;';
      // Încearcă să insereze după header, altfel la începutul body
      var header = document.querySelector('#header, .site-header, header');
      if (header && header.nextSibling) {
        header.parentNode.insertBefore(spacer, header.nextSibling);
      } else if (document.body.firstChild) {
        document.body.insertBefore(spacer, document.body.firstChild);
      }
    }
  }

  function removeSpacer() {
    var spacer = document.getElementById(WIDGET_ID + '-spacer');
    if (spacer) spacer.parentNode.removeChild(spacer);
  }

  /* ─── CSS ────────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById(WIDGET_ID + '-styles')) return;
    var css = [
      '#' + WIDGET_ID + ' {',
      '  position: fixed;',
      '  top: 0;',
      '  left: 0;',
      '  right: 0;',
      '  width: 100%;',
      '  height: ' + WIDGET_HEIGHT + 'px;',
      '  background: #1a1a1a;',
      '  color: #fff;',
      '  z-index: 9999;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;',
      '  font-size: 14px;',
      '  line-height: 1;',
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.4);',
      '  box-sizing: border-box;',
      '  padding: 0 12px;',
      '  transition: top 0.2s ease;',
      '}',
      '#' + WIDGET_ID + '-inner {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 8px;',
      '  max-width: 1200px;',
      '  width: 100%;',
      '  flex-wrap: nowrap;',
      '  overflow: hidden;',
      '}',
      '#' + WIDGET_ID + '-icon {',
      '  font-size: 18px;',
      '  flex-shrink: 0;',
      '}',
      '#' + WIDGET_ID + '-text {',
      '  color: #ccc;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  flex: 1;',
      '  min-width: 0;',
      '}',
      '#' + WIDGET_ID + '-car {',
      '  color: #fff;',
      '  font-weight: 700;',
      '  white-space: nowrap;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '  max-width: 220px;',
      '  flex-shrink: 0;',
      '}',
      '#' + WIDGET_ID + '-close {',
      '  background: transparent;',
      '  border: 1px solid #555;',
      '  color: #aaa;',
      '  width: 22px;',
      '  height: 22px;',
      '  border-radius: 50%;',
      '  cursor: pointer;',
      '  font-size: 14px;',
      '  line-height: 1;',
      '  padding: 0;',
      '  display: flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  flex-shrink: 0;',
      '  transition: all 0.15s;',
      '}',
      '#' + WIDGET_ID + '-close:hover {',
      '  border-color: #d63031;',
      '  color: #d63031;',
      '}',
      '#' + WIDGET_ID + '-label {',
      '  color: #aaa;',
      '  font-size: 13px;',
      '  white-space: nowrap;',
      '  flex-shrink: 1;',
      '  overflow: hidden;',
      '  text-overflow: ellipsis;',
      '}',
      '#' + WIDGET_ID + '-btn, #' + WIDGET_ID + '-change {',
      '  background: #d63031;',
      '  color: #fff !important;',
      '  border: none;',
      '  border-radius: 6px;',
      '  padding: 6px 14px;',
      '  font-size: 13px;',
      '  font-weight: 700;',
      '  cursor: pointer;',
      '  text-decoration: none !important;',
      '  white-space: nowrap;',
      '  flex-shrink: 0;',
      '  transition: background 0.15s;',
      '  display: inline-block;',
      '}',
      '#' + WIDGET_ID + '-btn:hover, #' + WIDGET_ID + '-change:hover {',
      '  background: #b52424;',
      '}',
      '/* Mobile */',
      '@media (max-width: 600px) {',
      '  #' + WIDGET_ID + ' { font-size: 12px; padding: 0 8px; }',
      '  #' + WIDGET_ID + '-label { display: none; }',
      '  #' + WIDGET_ID + '-car { max-width: 130px; }',
      '  #' + WIDGET_ID + '-text { font-size: 12px; }',
      '  #' + WIDGET_ID + '-btn, #' + WIDGET_ID + '-change { padding: 5px 10px; font-size: 12px; }',
      '}'
    ].join('\n');

    var style = document.createElement('style');
    style.id = WIDGET_ID + '-styles';
    style.type = 'text/css';
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  }

  /* ─── Render ─────────────────────────────────────────────────── */
  function renderPromoBar(container) {
    container.style.display = 'flex';
    container.innerHTML =
      '<div id="' + WIDGET_ID + '-inner">' +
        '<span id="' + WIDGET_ID + '-icon">🚗</span>' +
        '<span id="' + WIDGET_ID + '-text">Selectează mașina ta pentru produse compatibile</span>' +
        '<a href="' + CONFIGURATOR_URL + '" id="' + WIDGET_ID + '-btn" target="_blank" rel="noopener">Configurează acum</a>' +
      '</div>';
  }

  function renderVehicleBar(container, vehicle) {
    var marca = escHtml(vehicle.marcaNume || vehicle.marca || '');
    var model = escHtml(vehicle.model || (vehicle.modelNume ? vehicle.modelNume.replace(/\s+\d{4}.*$/, '') : ''));
    var displayName = (marca + (model ? ' ' + model : '')).trim();

    container.style.display = 'flex';
    container.innerHTML =
      '<div id="' + WIDGET_ID + '-inner">' +
        '<span id="' + WIDGET_ID + '-icon">🚗</span>' +
        '<strong id="' + WIDGET_ID + '-car">' + displayName + '</strong>' +
        '<button id="' + WIDGET_ID + '-close" title="Șterge selecția" aria-label="Șterge mașina selectată">×</button>' +
        '<span id="' + WIDGET_ID + '-label">Navighezi pentru mașina ta →</span>' +
        '<a href="' + CONFIGURATOR_URL + '" id="' + WIDGET_ID + '-change" target="_blank" rel="noopener">Schimbă mașina</a>' +
      '</div>';

    document.getElementById(WIDGET_ID + '-close').addEventListener('click', function () {
      removeVehicle();
      container.style.display = 'none';
      removeSpacer();
    });
  }

  function render(container) {
    var vehicle = getVehicle();
    if (vehicle && (vehicle.marcaNume || vehicle.marca)) {
      renderVehicleBar(container, vehicle);
      ensureSpacer();
    } else {
      renderPromoBar(container);
      ensureSpacer();
    }
    positionWidget(container);
  }

  /* ─── Poziționare sub header ─────────────────────────────────── */
  function positionWidget(container) {
    var c = container || document.getElementById(WIDGET_ID);
    if (!c) return;
    var headerBottom = getHeaderBottom();
    c.style.top = headerBottom + 'px';
    // Actualizează spacer-ul dacă header-ul nu e la top 0
    var spacer = document.getElementById(WIDGET_ID + '-spacer');
    if (spacer && headerBottom === 0) {
      // Fără header detectat — spacer-ul compensează widget-ul
      spacer.style.height = WIDGET_HEIGHT + 'px';
    }
  }

  /* ─── URL param fallback (redirect pattern) ──────────────────── */
  function checkUrlParam() {
    try {
      var search = window.location.search;
      if (!search) return false;
      var match = search.match(/[?&]edotec_vehicle=([^&]+)/);
      if (!match) return false;
      var data = JSON.parse(decodeURIComponent(match[1]));
      if (data && (data.marcaNume || data.marca)) {
        saveVehicle(data);
        // Curăță URL-ul
        var cleanUrl = window.location.href.replace(/[?&]edotec_vehicle=[^&]+/, '').replace(/\?$/, '').replace(/&&/, '&').replace(/\?&/, '?');
        window.history.replaceState({}, document.title, cleanUrl);
        return true;
      }
    } catch (e) {}
    return false;
  }

  /* ─── Init ───────────────────────────────────────────────────── */
  function init() {
    // Verifică URL param (redirect pattern cross-origin)
    checkUrlParam();

    injectStyles();

    // Crează container widget dacă nu există
    var container = document.getElementById(WIDGET_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = WIDGET_ID;
      container.setAttribute('role', 'banner');
      container.setAttribute('aria-label', 'EdoTec — mașina ta selectată');
      document.body.appendChild(container);
    }

    render(container);

    // Reactualizare poziție la resize
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { positionWidget(container); }, 100);
    });

    // Sincronizare same-origin cross-tab (storage event)
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) {
        render(container);
      }
    });

    // Sincronizare cross-origin via postMessage
    // (configurator.edotec.ro trimite mesaj după selecție)
    window.addEventListener('message', function (e) {
      if (e.origin !== CONFIGURATOR_ORIGIN) return;
      try {
        var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (msg && msg.type === 'edotec_vehicle_selected' && msg.vehicle) {
          saveVehicle(msg.vehicle);
          render(container);
        }
      } catch (err) {}
    });

    // Re-detectare header după ce pagina s-a încărcat complet
    window.addEventListener('load', function () {
      setTimeout(function () { positionWidget(container); }, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
