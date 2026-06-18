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

  function makePinIcon(title) {
    return L.divIcon({
      className: 'life-map-divicon',
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

  function init() {
    var frame = document.getElementById('lifeMapFrame');
    if (!frame) return;
    if (typeof L === 'undefined') {
      console.warn('[life-map] Leaflet (L) not found — did you add the Leaflet <script> in life.html?');
      return;
    }
    if (typeof LIFE_MAP === 'undefined') return;

    var glyph = LIFE_MAP.pinIcon || '◆';
    var points = (LIFE_MAP.points || []).filter(function (p) {
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
    points.forEach(function (pt) {
      var m = L.marker([pt.lat, pt.lng], {
        icon: makePinIcon(pt.title),
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
    if (Array.isArray(LIFE_MAP.center)) {
      map.setView(LIFE_MAP.center, LIFE_MAP.zoom || 2);
    } else if (markers.length === 1) {
      map.setView(points[0], LIFE_MAP.zoom || 4);
    } else if (markers.length > 1) {
      var group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.35));
      if (map.getZoom() > (LIFE_MAP.zoom != null ? LIFE_MAP.zoom + 4 : 6)) {
        map.setZoom(LIFE_MAP.zoom != null ? LIFE_MAP.zoom + 4 : 6);
      }
    } else {
      map.setView([20, 0], LIFE_MAP.zoom || 2);
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

    // EDIT mode: click the map to copy a ready-to-paste config snippet
    if (LIFE_MAP.edit) {
      frame.classList.add('edit-mode');
      map.on('click', function (e) {
        var lat = e.latlng.lat.toFixed(4);
        var lng = e.latlng.lng.toFixed(4);
        var snippet = '{ lat: ' + lat + ', lng: ' + lng + ", title: '', text: '', img: '' },";
        console.log('[life-map] ' + snippet);
        if (navigator.clipboard) navigator.clipboard.writeText(snippet);
        L.popup({ className: 'life-map-leaflet-popup' })
          .setLatLng(e.latlng)
          .setContent('<div class="life-map-popup-title">' + lat + ', ' + lng + '</div>' +
                      '<div class="life-map-popup-text">copied to clipboard ✔ — paste into config.js</div>')
          .openOn(map);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
