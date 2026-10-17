# Beach Soundwalk — Project Brief for Claude Code

## 1. What this is

A location-based music system for a specific beach in Donegal, Ireland. A composer (Ed Devane — sound artist, composer, electronics/instrument builder) writes a piece of music tailored to the beach. Listeners walk the beach with a phone and headphones, and the music they hear is shaped by **where they are standing** and **which way they are facing**.

The system has two parts:

1. **Editor** (desktop browser, composer-facing) — draw active zones on a map of the beach, attach audio files, set mix parameters, audition the mix by dragging a virtual listener around, export the piece.
2. **Player** (phone browser, listener-facing) — downloads the piece, tracks GPS position and compass heading, mixes the audio live in Web Audio.

Both are static web pages hosted for free (GitHub Pages). No backend.

This is a custom system by choice. General-purpose platforms (e.g. Echoes.xyz) exist and were researched, but the aim is full control over how position and orientation map onto sound — not just volume, but potentially filters, playback parameters, etc.

## 2. Artistic intentions

- **Shared time.** The original idea was a live FM broadcast to receiver headphones: everyone hears the same thing at the same moment. That shared, real-time quality matters. The player therefore runs on a **shared clock**: all listeners hear the same point in the piece at the same moment, regardless of when they arrived. Where you stand changes *what mix* you hear; it doesn't change *when* in the piece you are.
- **Sparse material.** The music is mostly sparse — few layers at once, space, quiet. Not dense multitrack. Audio quality matters (artefacts are exposed in quiet material).
- **Position-linked mixing, not just triggers.** Crossfades should follow the listener's real position (distance into a zone), not just a timed fade when a boundary is crossed.
- **Body orientation.** A listener standing still and turning their body (phone in hand *or* in pocket) should hear a different result. This is a coarse gesture — facing the sea vs facing the dunes — not precision aiming.
- **The beach and tide are part of the piece.** The active area is roughly **1 km × 0.2 km** at low tide. Parts of the intertidal area are underwater at high tide, and spring low tides expose more beach than neap low tides. Zone placement can respond to this.
- **Maximum compatibility.** Must work on as many phones (iOS + Android, including mid-range/older Android) and headphones (any wired or Bluetooth, no head-tracking hardware required) as possible.

## 3. Composer's workflow (how Ed wants to work)

1. **Walk the perimeter** at a spring low tide with a GPS logging app (e.g. GPSLogger on Android, 1 s interval, high accuracy), pausing ~30 s at corners/features and dropping named waypoints. Export as GPX or KML.
2. **Import that track into the editor** as a ground-truth boundary layer over OpenStreetMap. The walked track is the reference — not satellite imagery, whose tide state and alignment can be off.
3. **Draw zones** inside the boundary, like drawing zones over a webcam image in Ed's earlier MIDI-grid tool: freely drawn polygons and circles, editable afterwards.
4. **Attach audio and parameters** to each zone.
5. **Audition at the desk** by dragging a listener dot around the map and rotating its heading, hearing the live mix.
6. **Export** the piece as a JSON file plus audio files, commit to the GitHub Pages repo.
7. **Test on the beach** with real phones.

Ed previously "vibe coded" a webcam tool with an adjustable grid assignable to MIDI notes and freely drawable zones that became sliders. The editor's zone-drawing should feel like that. Ed may provide that code for reference — ask for it if useful.

## 4. Field findings so far

Measured on the beach on Ed's Android phone (GPS Test app, 17 Oct 2026, open sky):

- 3D fix, **±3 m estimated accuracy**, 77 satellites in view (multi-constellation), average SNR 36.7.
- This is the phone's *estimate*, not measured drift. A stand-still drift test and dune/rock comparison are still to do. Other phones (cheaper Androids, older iPhones) may be noticeably worse.
- Design assumption: zones ~15–20 m across or larger, soft gain curves, position smoothing. Make smoothing parameters adjustable so they can be tuned on site.
- **Mobile signal:** good 5G on Ed's network. Other networks/roaming visitors may differ. Design for download-once-then-offline regardless.

## 5. Technical decisions (already made)

- **Stack:** vanilla HTML/CSS/JS, **no build step**. Leaflet for maps. Leaflet-Geoman (or similar) for drawing/editing polygons. Small, readable files Ed can tinker with.
- **Hosting:** GitHub Pages. Limits: published site ≤ 1 GB, soft bandwidth 100 GB/month, keep individual files well under 100 MB. Cloudflare Pages is the fallback (25 MiB per-file cap, 20,000 files).
- **Base maps in editor:** OpenStreetMap tiles + imported GPS track (GPX/KML) as an overlay layer. (Tailte Éireann / Ordnance Survey Ireland mapping is licensed — not used.)
- **Languages:** player UI in **English + Irish**, switchable. All UI strings in one translation file. Do **not** machine-translate Irish — leave Irish strings as clearly marked placeholders for Ed to supply/check.
- **Playback timing:** always clock-synced (see §7).

## 6. Data model

One `piece.json` describes everything. Suggested shape (refine as needed):

```json
{
  "title": { "en": "...", "ga": "..." },
  "epoch": "2026-01-01T00:00:00Z",
  "boundary": { "type": "Polygon", "coordinates": [] },
  "settings": { "positionSmoothing": 0.3, "headingSmoothing": 0.2 },
  "zones": [
    {
      "id": "z1",
      "name": "Stream mouth",
      "shape": { "type": "Polygon", "coordinates": [] },
      "audio": { "src": "audio/stream.opus", "fallback": "audio/stream.m4a", "loopLengthSec": 240 },
      "gain": { "max": 1.0, "curve": "s-curve", "edgeFeatherM": 10 },
      "orientation": { "enabled": true, "bearingDeg": 290, "widthDeg": 90, "offGain": 0.3 }
    }
  ]
}
```

Use GeoJSON conventions ([lng, lat]) for shapes. Gain curves to offer: linear, S-curve, linear-square (hold then sharp drop), inverse.

## 7. Clock sync

- Every audio layer is a loop (or a long file) with a known length. Its playback position = `(now − epoch) mod loopLength`.
- `now` comes from the phone clock. Network-synced phone clocks are usually within a second or so of each other — acceptable for sparse material. Add an optional check against a time source when online, and log the measured offset in debug mode so it can be verified on real devices.
- When a listener enters a zone, its audio joins **at the current clock position**, fading in according to position — never restarting from the top.

## 8. Audio — formats and memory

- **Default format: Opus** (~128–160 kbps stereo) with **AAC (.m4a) fallback** for devices that can't play Opus. Feature-detect with `canPlayType`. Optional "high quality" toggle may load FLAC or 320 kbps MP3 later.
- **Memory trap — important:** `decodeAudioData` decodes to raw float PCM (~20 MB per stereo minute) regardless of source format. Loading a whole long piece as AudioBuffers will crash cheaper phones.
  - Long beds → stream via `<audio>` elements + `MediaElementAudioSourceNode`.
  - Short sounds → AudioBuffers.
  - Or load/unload zone audio as the listener approaches and leaves.
  - Handle seek-to-clock-position for streamed elements.
- **Offline:** a service worker caches the page, `piece.json`, and all audio on first open (e.g. at the car park, via a QR code sign). Show download progress and a clear "ready — you can walk now" state.

## 9. Orientation

- Use `DeviceOrientationEvent` compass heading. iOS needs a user tap to grant permission (`DeviceOrientationEvent.requestPermission()`) and reports `webkitCompassHeading`. Android uses `deviceorientationabsolute`. Handle both.
- Phone in pocket: heading roughly follows the hips — that's fine and intended.
- Compasses drift and are thrown off by nearby metal. Smooth the heading, treat it as coarse, and show a calibration hint if accuracy looks bad.
- Orientation can do two things (implement both, configurable per zone):
  1. **Directional gain** — a zone is louder when facing a given bearing.
  2. **Spatial placement** — Web Audio `PannerNode` (HRTF) with listener orientation from the compass, so a sound appears to come from a fixed point in the landscape. Works on any stereo headphones.

## 10. Keeping the player alive

- A web page loses audio/location when the screen locks, especially on iOS. Ed has previously solved this for another app (Sonicraft) with a script forcing it to stay open.
- Use the **Screen Wake Lock API**, with a fallback for browsers that lack it.
- Provide a **pocket mode**: a black overlay that ignores touches (so the lit screen in a pocket doesn't trigger stray taps), with a deliberate gesture to exit. Keep the screen dim.
- Re-acquire the wake lock on `visibilitychange`.
- **Measure battery drain** for a full walk on a mid-range phone.

## 11. Editor features

- Leaflet map with OSM tiles; import GPX/KML boundary track and named waypoints.
- Draw, edit, move, delete zones (polygons + circles). Select a zone to edit its audio and parameters in a side panel.
- Upload/assign audio files per zone (local files in the editor; export references relative paths).
- **Audition mode:** draggable listener dot with a rotatable heading arrow; live Web Audio mix using the *same mixing code* as the player (share one module). Clock-synced playback running.
- **GPS jitter simulation:** optional random wander (configurable metres) on the virtual listener, to preview how real GPS wobble will affect fades.
- Save/load `piece.json`. Export bundle (JSON + list of audio files to copy into the repo).

## 12. Player features

- Language switch (EN/GA).
- Download + cache step with progress.
- Permissions flow (location, motion/compass) with clear plain-language explanations in both languages.
- Live mixing from GPS + heading. Position smoothing.
- Pocket mode + wake lock.
- Gentle message when the listener is outside the boundary ("walk toward the beach").
- **Debug overlay** (hidden toggle): lat/lng, accuracy, smoothed position, heading, per-zone gain, clock offset, memory/audio state. Ed will use this on the beach.
- Optional: log a walk (positions + headings over time) and export as GPX/JSON, to review drift and replay a real walk in the editor.

## 13. Working rules

- **Don't claim something works until it has been tested.** Say what was verified and how (e.g. "tested in desktop Chrome with simulated position" vs "tested on a real phone on the beach"). Be explicit about what is untested, especially anything iOS-, compass-, or background-audio-related, which can't be verified on a desktop.
- Build in small, runnable milestones. Each milestone should produce something Ed can open and try.
- Keep the mixing logic in one shared module used by both editor and player.
- Prefer simple, readable code over cleverness. Comment the position → gain and clock math.
- When unsure about an artistic or behavioural choice, ask Ed rather than guessing.

## 14. Suggested milestones

1. **GPS + compass test page** (player-side): live readout of position, accuracy, heading, with a drift log and export. Deploy to GitHub Pages and test on the beach first.
2. **Editor skeleton:** OSM map, GPX/KML import, draw/edit zones, save/load `piece.json`.
3. **Shared mixer + audition:** clock-synced playback, distance-based gain, draggable listener in the editor.
4. **Player v1:** offline caching, GPS-driven mix, wake lock, pocket mode, debug overlay.
5. **Orientation:** directional gain + HRTF spatial placement, in editor audition and player.
6. **Bilingual UI**, format fallback, battery test, multi-device testing.

## 15. Open questions (ask Ed when relevant)

- Name of the piece/project, and which beach (only needed for defaults/map centre).
- Total duration and structure: one long clock-synced cycle, or several loops of different lengths phasing against each other?
- What should a listener hear outside all zones: silence, a bed, the beach itself?
- Should zone behaviour change with the tide (e.g. zones active only at low water)? If so, a tide-table source would be needed.
- Beyond gain: which parameters should position/orientation drive (filter cutoff, playback rate, reverb send, granular parameters)?
- Whether a live FM broadcast event might run alongside the app version on certain days.
