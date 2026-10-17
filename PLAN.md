# Development plan

Settled decisions (17 Oct 2026):
- Beach: Carrickfin strand, by Donegal Airport.
- Test phones: Samsung S25, iPhone 16.
- GitHub: `ed-devane`, GitHub Pages.
- **Outside the perimeter or outside all zones = silence.** The piece only plays inside the perimeter Ed walks with a GPS logger. The perimeter is walked at *average* low tide so it works year-round.
- Tide: later feature. A tide calculator plus the current date and time decides which content is available (more at lower tides).

## Milestones

0. **Repo + skeleton**: done. Folder layout, landing page, shared modules.
1. **Sensor + keep-alive test page** (`tools/sensor-test/`): built, untested on phones.
   - GPS readout, update interval, gap detection.
   - Stand-still drift: scatter plot, CEP50 / 95% / max, raw vs smoothed (adjustable).
   - Compass: iOS `webkitCompassHeading`; Android absolute orientation, giving both top-of-phone and back-of-phone (pocket) heading.
   - Directional test tone: set a target bearing, then the tone is loud facing it and quiet facing away.
   - Wake lock, pocket mode (exit = two-finger hold for 2 s), audio-clock stall detection.
   - Clock offset against the server Date header (±0.5 s), battery (Android only).
   - GPX + JSON export.
2. **Editor skeleton**: Leaflet + OSM, GPX/KML import, draw/edit polygons + circles (Geoman), side panel, save/load `piece.json`, undo.
3. **Shared mixer + audition**: `geo.js` local metres, distance-inside-edge → gain curves, `clock.js` epoch/loop maths, draggable listener + heading, GPS jitter simulation, per-zone gain meters.
4. **Player v1**: service worker cache with download progress (including Range-request handling so iOS plays cached audio), streamed beds vs decoded short sounds, load/unload by proximity, periodic clock resync, GPS-driven mix, wake lock + fallback, pocket mode, debug overlay, walk log.
5. **Orientation**: per-zone directional gain + HRTF spatial placement, calibration hint.
6. **Tide**: offline tide table (precomputed high/low water for a year from Marine Institute data for the nearest gauge, e.g. Aranmore), current tide state given to the mixer, zones gated or weighted by tide height.
7. **Polish**: bilingual UI (Irish strings from Ed), Opus/AAC detection, battery test over a full walk, device testing matrix.

## Field test checklist for milestone 1 (both phones)

- [ ] Stand still 5 min in open sky: note CEP50 / 95% / max, raw vs smoothed.
- [ ] Same near the dunes / rocks.
- [ ] Walk 10 min with phone in hand, then 10 min in pocket with pocket mode on. Check the log for GPS gaps, audio stalls and wake-lock releases.
- [ ] Compass: face the sea, set target, turn slowly. Repeat with phone upright in a pocket. Does the heading follow the hips?
- [ ] Clock offset on each phone.
- [ ] Battery % at start and end (S25).
- [ ] Export JSON + GPX from each run.
