/**
 * Life Map — REAL-WORLD travel map (Leaflet + OpenStreetMap/CARTO tiles).
 *
 *  - A real, pannable/zoomable world map fills #lifeMapFrame.
 *  - Pins are placed by real latitude/longitude (see module/lifemap/config.js).
 *  - Light/dark CARTO basemap follows the site's data-theme toggle.
 *  - Pixel ◆ markers + VT323 popups keep the retro look.
 *
 * Requires Leaflet to be loaded first (added in life.html):
 *   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" ... />
 *   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" ...></script>
 *
 * Data lives in module/lifemap/config.js (the LIFE_MAP global).
 */
(function () {
  'use strict';

  var TILES = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  };
  var ATTRIBUTION =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; ' +
    '<a href="https://carto.com/attributions">CARTO</a>';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  // Pixel-art teardrop location pin, drawn as crisp 1x1 rects.
  // '#' = pin body, 'o' = punched hole (center dot), ' ' = empty.
  var PIN_SPRITE = [
    ' ##### ',
    '#######',
    '##ooo##',
    '##ooo##',
    '#######',
    ' ##### ',
    '  ###  ',
    '   #   '
  ];
  var PIN_W = 7, PIN_H = 8;

  function runRects(rows, ch) {
    var out = '';
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r], c = 0;
      while (c < PIN_W) {
        if (row.charAt(c) === ch) {
          var start = c;
          while (c < PIN_W && row.charAt(c) === ch) c++;
          out += '<rect x="' + start + '" y="' + r + '" width="' + (c - start) + '" height="1"/>';
        } else { c++; }
      }
    }
    return out;
  }

  function buildPinSVG() {
    return '<svg class="life-map-pin-svg" viewBox="0 0 ' + PIN_W + ' ' + PIN_H + '" ' +
           'shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">' +
           '<g fill="currentColor">' + runRects(PIN_SPRITE, '#') + '</g>' +
           '<g class="hole">' + runRects(PIN_SPRITE, 'o') + '</g></svg>';
  }

  function makePinIcon(title, type) {
    var kind = type === 'lived' ? 'lived' : 'travel';
    return L.divIcon({
      className: 'life-map-divicon life-map-divicon--' + kind,
      html:
        '<span class="life-map-pin-drop">' + buildPinSVG() + '</span>' +
        '<span class="life-map-pin-label">' + (title || '') + '</span>',
      iconSize: null,        // let CSS size it
      iconAnchor: [0, 0]     // tip anchored to the point via CSS transform
    });
  }

  function popupHTML(pt) {
    var html = '';
    if (pt.img) {
      html += '<div class="life-map-popup-img"><img src="' + pt.img +
              '" alt="' + (pt.title || '') + '"></div>';
    }
    html += '<div class="life-map-popup-title">' + (pt.title || '') + '</div>';
    if (pt.text) html += '<div class="life-map-popup-text">' + pt.text + '</div>';
    return html;
  }

  // Spots + map options now live in module/lifemap/spots.json — edit that file
  // to add places. Each spot: { type, lat, lng, title, text, img }.
  //   type : 'lived' or 'travel' (controls the marker colour)
  var SPOTS_URL = 'module/lifemap/spots.json';

  function loadConfig() {
    return fetch(SPOTS_URL, { cache: 'no-cache' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        console.warn('[life-map] could not load ' + SPOTS_URL + ' (' + err.message +
                     '). Serve the site over http(s) (not file://). ' +
                     'Falling back to window.LIFE_MAP if present.');
        return (typeof LIFE_MAP !== 'undefined') ? LIFE_MAP : null;
      });
  }

  function render(frame, cfg) {
    // accept either `spots` (JSON) or legacy `points` (old config.js)
    var spots = (cfg.spots || cfg.points || []).filter(function (p) {
      return typeof p.lat === 'number' && typeof p.lng === 'number';
    });

    var map = L.map(frame, {
      worldCopyJump: true,
      scrollWheelZoom: false,   // avoid hijacking page scroll; users zoom with the +/- control or double-click
      minZoom: 1,
      attributionControl: true
    });

    // tile layer (swaps with theme)
    var tiles = L.tileLayer(TILES[currentTheme()], {
      attribution: ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true
    }).addTo(map);

    // markers
    var markers = [];
    spots.forEach(function (pt) {
      var m = L.marker([pt.lat, pt.lng], {
        icon: makePinIcon(pt.title, pt.type),
        title: pt.title || ''
      }).addTo(map);
      m.bindPopup(popupHTML(pt), {
        className: 'life-map-leaflet-popup',
        closeButton: true,
        maxWidth: 220,
        minWidth: 160
      });
      markers.push(m);
    });

    // initial view: explicit center, else fit all pins, else world
    if (Array.isArray(cfg.center)) {
      map.setView(cfg.center, cfg.zoom || 2);
    } else if (markers.length === 1) {
      map.setView(spots[0], cfg.zoom || 4);
    } else if (markers.length > 1) {
      var group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.35));
      if (map.getZoom() > (cfg.zoom != null ? cfg.zoom + 4 : 6)) {
        map.setZoom(cfg.zoom != null ? cfg.zoom + 4 : 6);
      }
    } else {
      map.setView([20, 0], cfg.zoom || 2);
    }

    // re-theme tiles when the toggle flips data-theme on <html>
    var obs = new MutationObserver(function () {
      var url = TILES[currentTheme()];
      if (tiles._url !== url) tiles.setUrl(url);
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // size fix once laid out (frame uses aspect-ratio / flex)
    setTimeout(function () { map.invalidateSize(); }, 0);
    window.addEventListener('resize', function () { map.invalidateSize(); });

    // Ctrl/⌘ + wheel zooms; plain wheel scrolls the page (and flashes a hint).
    // (Mac trackpad pinch fires ctrl+wheel too, so pinch-to-zoom works as well.)
    var zoomHint = L.DomUtil.create('div', 'life-map-zoom-hint', frame);
    zoomHint.innerHTML = '按住 Ctrl 滚动缩放 · Use Ctrl + scroll to zoom';
    var hintTimer;
    frame.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.metaKey) {
        if (!map.scrollWheelZoom.enabled()) map.scrollWheelZoom.enable();
        zoomHint.classList.remove('visible');
      } else {
        if (map.scrollWheelZoom.enabled()) map.scrollWheelZoom.disable();
        zoomHint.classList.add('visible');
        clearTimeout(hintTimer);
        hintTimer = setTimeout(function () { zoomHint.classList.remove('visible'); }, 1100);
      }
    }, { passive: true, capture: true });

    // EDIT mode: click the map to copy a ready-to-paste spots.json entry
    if (cfg.edit) {
      frame.classList.add('edit-mode');
      map.on('click', function (e) {
        var lat = e.latlng.lat.toFixed(4);
        var lng = e.latlng.lng.toFixed(4);
        var snippet = '{ "type": "travel", "lat": ' + lat + ', "lng": ' + lng +
                      ', "title": "", "text": "" },';
        console.log('[life-map] ' + snippet);
        if (navigator.clipboard) navigator.clipboard.writeText(snippet);
        L.popup({ className: 'life-map-leaflet-popup' })
          .setLatLng(e.latlng)
          .setContent('<div class="life-map-popup-title">' + lat + ', ' + lng + '</div>' +
                      '<div class="life-map-popup-text">copied to clipboard ✔ — paste into spots.json</div>')
          .openOn(map);
      });
    }
  }

  // fill the legend dots + the inline hint pin with the same pixel teardrop
  function fillLegend() {
    var dots = document.querySelectorAll('.life-map-legend-dot, .life-map-pin-inline');
    for (var i = 0; i < dots.length; i++) dots[i].innerHTML = buildPinSVG();
  }

  function init() {
    fillLegend();
    var frame = document.getElementById('lifeMapFrame');
    if (!frame) return;
    if (typeof L === 'undefined') {
      console.warn('[life-map] Leaflet (L) not found — did you add the Leaflet <script> in life.html?');
      return;
    }
    loadConfig().then(function (cfg) {
      if (cfg) render(frame, cfg);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
