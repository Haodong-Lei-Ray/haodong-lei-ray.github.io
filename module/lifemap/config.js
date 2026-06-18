/**
 * Life Map — how to add places.
 *
 * Spots are now loaded from a JSON file:  module/lifemap/spots.json
 * (no JavaScript editing needed). The file looks like this:
 *
 *   {
 *     "zoom": 2,           // initial zoom (1 = whole world, higher = closer)
 *     "center": null,      // [lat, lng] to centre on, or null = auto-fit all spots
 *     "edit": false,       // true (locally) to CLICK the map and copy a ready
 *                          //   lat/lng entry to your clipboard — keep false when publishing
 *     "spots": [
 *       {
 *         "type":  "lived",      // "lived"  = a place you live in   (one marker colour)
 *                                // "travel" = a place you travelled (a different colour)
 *         "lat":   32.0603,      // latitude  (-90..90)
 *         "lng":   118.7969,     // longitude (-180..180)
 *         "title": "Nanjing",    // popup header
 *         "text":  "A note about this place.",
 *         "img":   ""            // OPTIONAL photo path, e.g. "assets/images/foo.png"
 *       }
 *     ]
 *   }
 *
 * Tip for coordinates: set "edit": true, open life.html, and click the map —
 * the entry is printed to the console AND copied to your clipboard, ready to
 * paste into "spots". Or right-click a spot in Google Maps to grab "lat, lng".
 *
 * NOTE: spots.json is fetched over http(s), so view the site through a local
 * server (e.g. the one you already use on localhost) or GitHub Pages — opening
 * life.html directly as a file:// URL will block the fetch.
 */
