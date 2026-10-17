// geo.js — lat/lng ↔ local flat metres.
//
// The beach is ~1 km across, so we treat the ground as flat around a chosen
// origin (an "equirectangular" projection). Error over 1 km is millimetres,
// far below GPS noise, and it means all zone maths can be plain x/y geometry.
//
//   x = metres east of origin
//   y = metres north of origin

export const EARTH_RADIUS_M = 6371008.8;
const DEG = Math.PI / 180;

// Default map centre: Carrickfin strand, by Donegal Airport (approximate).
export const CARRICKFIN = { lat: 55.044, lng: -8.352 };

export function makeLocalFrame(lat0, lng0) {
  // One degree of latitude is always the same length; one degree of
  // longitude shrinks by cos(latitude) as you go north.
  const mPerDegLat = EARTH_RADIUS_M * DEG;
  const mPerDegLng = EARTH_RADIUS_M * DEG * Math.cos(lat0 * DEG);
  return {
    lat0, lng0,
    toXY(lat, lng) {
      return [(lng - lng0) * mPerDegLng, (lat - lat0) * mPerDegLat];
    },
    toLatLng(x, y) {
      return [lat0 + y / mPerDegLat, lng0 + x / mPerDegLng];
    },
  };
}

// Great-circle distance in metres (for sanity checks; local frame is enough
// for anything on the beach).
export function haversineM(lat1, lng1, lat2, lng2) {
  const dLat = (lat2 - lat1) * DEG;
  const dLng = (lng2 - lng1) * DEG;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}
