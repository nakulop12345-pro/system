// ISS reference data and TLE sources. Edit STORED_TLE here to refresh the offline element set.
export const ISS_DATA = {
  name: 'International Space Station', type: 'Orbital research station', diam: 0.109, mass: '≈ 420,000 kg',
  period: 92.9 / 1440, rot: null, tilt: null, temp: '−120 °C to +120 °C (sunlit/shade swing)', atmo: 'None (pressurised modules)',
  fact: 'Continuously crewed since November 2000; about 109 m × 73 m, it crosses the sky in minutes and orbits Earth about 15.5 times per day.'
};
// Simplified circular orbit, used only when no TLE valid for the simulated date is available (NOT live data).
export const FALLBACK_ORBIT = { altitudeKm: 420, inclinationDeg: 51.6, periodMin: 92.9 };
// Live element set (CelesTrak GP endpoint, TLE format). Fetched in the browser; falls back silently if blocked/offline.
export const TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';
// Offline element set: a real ISS TLE from 2008-09-20, kept as a format reference. It is only used when the simulation
// date is within MAX_TLE_AGE_DAYS of its epoch; paste a newer TLE here to make the offline fallback current.
export const STORED_TLE = {
  line1: '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927',
  line2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537'
};
export const MAX_TLE_AGE_DAYS = 30; // SGP4 error grows quickly away from the TLE epoch
export const SATELLITE_JS_URL = 'satellite.js'; // resolved by the import map in index.html (satellite.js 5.0.0, MIT)
