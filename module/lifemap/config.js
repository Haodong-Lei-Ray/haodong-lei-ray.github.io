/**
 * Life Map — your real-world travel log (powered by Leaflet + OpenStreetMap).
 *
 * Add a place by adding an object to `points` below.
 *   lat, lng : the real-world coordinates (decimal degrees).
 *              lat = north/south (-90..90), lng = east/west (-180..180).
 *              Tip: turn on EDIT mode (see below) and CLICK the map — the
 *              lat/lng snippet is printed to the console AND copied to your
 *              clipboard, ready to paste here. Or grab coords from Google Maps
 *              (right-click a spot -> the first item is "lat, lng").
 *   title : the place name shown in the popup header.
 *   text  : a sentence or two — your note about the place.
 *   img   : OPTIONAL photo path, e.g. 'assets/images/dolomites.png'.
 *           Leave as '' for a text-only pin. Drop photos into assets/images/.
 *
 * Pins show to every visitor because this file is committed to the repo
 * (unlike localStorage, which would only live in your own browser).
 */
const LIFE_MAP = {
  pinIcon: '◆',     // marker glyph drawn on the map (try ◆ ● ★ ✦ ⚑)
  edit: false,      // set true locally to CLICK the map and copy lat/lng — keep false when publishing
  zoom: 2,          // initial zoom (1 = whole world, higher = closer). 2 is a comfy world view.
  center: null,     // [lat, lng] to centre on. null = auto-fit to all your pins.

  points: [
    {
      lat: 46.4102, lng: 11.8440,
      title: 'Dolomites',
      text: 'High-altitude hiking ⛰️ — everyone likes snow.',
      img: ''
    },
    {
      lat: 19.1959, lng: 109.7453,
      title: 'Hainan',
      text: 'Surfing 🏄 — come to Black.',
      img: ''
    },

    // --- copy this block to add a new place ---
    // {
    //   lat: 48.8566, lng: 2.3522,
    //   title: 'Place name',
    //   text: 'What happened here.',
    //   img: 'assets/images/your-photo.png'
    // },
  ]
};
