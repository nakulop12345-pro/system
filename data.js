// Scientific data. Sources: JPL SSD "Keplerian Elements for Approximate Positions of the Major Planets"
// (Standish, J2000), NASA Planetary Fact Sheet, JPL SSD planetary satellite tables. Values rounded.
export const J2000 = 2451545.0;      // Julian Date of epoch J2000.0
export const AU_KM = 149597870.7;

export const SUN = { name: 'Sun', type: 'G2V star (yellow dwarf)', diam: 1391400, mass: '1.989×10³⁰ kg', rot: 609.12, tilt: 7.25,
  temp: '5,772 K (photosphere)', atmo: 'Photosphere, chromosphere, corona',
  fact: 'The Sun holds 99.86% of the Solar System’s mass.' };

// el = [a (AU), e, I (deg), L mean longitude (deg), longitude of perihelion (deg), ascending node (deg)] at J2000
export const PLANETS = [
 { name: 'Mercury', type: 'Terrestrial planet', diam: 4879, mass: '3.30×10²³ kg', el: [0.38709927, 0.20563593, 7.00497902, 252.2503235, 77.45779628, 48.33076593], period: 87.969, rot: 1407.6, tilt: 0.03, temp: '167 °C mean', atmo: 'Exosphere (trace gases)', fact: 'One solar day on Mercury lasts two Mercury years.', look: 'mercury' },
 { name: 'Venus', type: 'Terrestrial planet', diam: 12104, mass: '4.87×10²⁴ kg', el: [0.72333566, 0.00677672, 3.39467605, 181.9790995, 131.60246718, 76.67984255], period: 224.701, rot: -5832.5, tilt: 177.4, temp: '464 °C surface', atmo: 'CO₂ ~96%, N₂ ~3.5%; ~92 bar', fact: 'Rotates retrograde; its day is longer than its year.', look: 'venus' },
 { name: 'Earth', type: 'Terrestrial planet', diam: 12756, mass: '5.97×10²⁴ kg', el: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], period: 365.256, rot: 23.934, tilt: 23.44, temp: '15 °C mean', atmo: 'N₂ 78%, O₂ 21%', fact: 'The only known world with liquid surface water and life.', look: 'earth' },
 { name: 'Mars', type: 'Terrestrial planet', diam: 6792, mass: '6.42×10²³ kg', el: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891], period: 686.98, rot: 24.623, tilt: 25.19, temp: '−65 °C mean', atmo: 'CO₂ ~95%; ~0.6% of Earth’s pressure', fact: 'Olympus Mons is the tallest known volcano, about 22 km high.', look: 'mars' },
 { name: 'Jupiter', type: 'Gas giant', diam: 142984, mass: '1.898×10²⁷ kg', el: [5.202887, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], period: 4332.59, rot: 9.925, tilt: 3.13, temp: '−110 °C (1 bar level)', atmo: 'H₂ ~90%, He ~10%', fact: 'The Great Red Spot is a storm wider than Earth, observed for over 150 years.', look: 'jupiter' },
 { name: 'Saturn', type: 'Gas giant', diam: 120536, mass: '5.683×10²⁶ kg', el: [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], period: 10759.22, rot: 10.656, tilt: 26.73, temp: '−140 °C (1 bar level)', atmo: 'H₂ ~96%, He ~3%', fact: 'Saturn’s mean density is lower than that of water.', look: 'saturn' },
 { name: 'Uranus', type: 'Ice giant', diam: 51118, mass: '8.681×10²⁵ kg', el: [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.9542763, 74.01692503], period: 30688.5, rot: -17.24, tilt: 97.77, temp: '−195 °C (1 bar level)', atmo: 'H₂, He, CH₄ ~2%', fact: 'Tilted about 98°, it effectively rolls around the Sun on its side.', look: 'uranus' },
 { name: 'Neptune', type: 'Ice giant', diam: 49528, mass: '1.024×10²⁶ kg', el: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], period: 60182, rot: 16.11, tilt: 28.32, temp: '−200 °C (1 bar level)', atmo: 'H₂, He, CH₄', fact: 'Winds reach roughly 2,000 km/h, the fastest measured on any planet.', look: 'neptune' }
];

// [name, parent planet, semi-major axis km, period days (negative = retrograde), radius km, [r,g,b] tint, optional fact]
export const MOONS = [
 ['Moon', 'Earth', 384400, 27.3217, 1737.4, [150, 148, 144], 'Its gravity drives Earth’s ocean tides and it is slowly receding about 3.8 cm per year.'],
 ['Phobos', 'Mars', 9376, 0.31891, 11.1, [110, 95, 85]],
 ['Deimos', 'Mars', 23463, 1.263, 6.2, [130, 115, 100]],
 ['Io', 'Jupiter', 421700, 1.769, 1821.6, [220, 190, 90], 'The most volcanically active body in the Solar System.'],
 ['Europa', 'Jupiter', 671034, 3.551, 1560.8, [215, 205, 185], 'A global subsurface ocean lies beneath its ice shell.'],
 ['Ganymede', 'Jupiter', 1070412, 7.155, 2634.1, [150, 140, 125], 'The largest moon in the Solar System, bigger than Mercury.'],
 ['Callisto', 'Jupiter', 1882709, 16.689, 2410.3, [95, 85, 75]],
 ['Mimas', 'Saturn', 185540, 0.942, 198.2, [160, 160, 160]],
 ['Enceladus', 'Saturn', 238040, 1.37, 252.1, [235, 240, 245], 'Geysers at its south pole feed Saturn’s E ring.'],
 ['Tethys', 'Saturn', 294670, 1.888, 531.1, [200, 200, 200]],
 ['Dione', 'Saturn', 377420, 2.737, 561.4, [190, 190, 188]],
 ['Rhea', 'Saturn', 527070, 4.518, 763.8, [180, 180, 178]],
 ['Titan', 'Saturn', 1221870, 15.945, 2574.7, [210, 160, 80], 'The only moon with a dense atmosphere and surface lakes of liquid methane.'],
 ['Iapetus', 'Saturn', 3560840, 79.33, 734.5, [140, 125, 105]],
 ['Miranda', 'Uranus', 129900, 1.413, 235.8, [165, 165, 165]],
 ['Ariel', 'Uranus', 190900, 2.52, 578.9, [175, 175, 172]],
 ['Umbriel', 'Uranus', 266000, 4.144, 584.7, [110, 110, 110]],
 ['Titania', 'Uranus', 436300, 8.706, 788.4, [150, 145, 140]],
 ['Oberon', 'Uranus', 583500, 13.463, 761.4, [135, 125, 120]],
 ['Triton', 'Neptune', 354759, -5.877, 1353.4, [215, 200, 195], 'Orbits Neptune backwards and is likely a captured Kuiper Belt object.']
];

// ---- Upgrade: extra planetary data, Pluto/Charon, comets ----
// Known-moon counts change as new moons are confirmed; '+' marks a lower bound.
const EXTRA = {
  Mercury: { g: 3.70, nMoons: 0, disc: 'Known since antiquity' }, Venus: { g: 8.87, nMoons: 0, disc: 'Known since antiquity' },
  Earth: { g: 9.80, nMoons: 1, disc: 'Home planet' }, Mars: { g: 3.73, nMoons: 2, disc: 'Known since antiquity; moons found by A. Hall, 1877' },
  Jupiter: { g: 24.79, nMoons: '95+', disc: 'Known since antiquity; Galilean moons seen by Galileo, 1610' },
  Saturn: { g: 10.44, nMoons: '270+', disc: 'Known since antiquity' },
  Uranus: { g: 8.87, nMoons: '28+', disc: '1781, William Herschel' },
  Neptune: { g: 11.15, nMoons: 16, disc: '1846, predicted by Le Verrier and Adams; observed by Galle' }
};
PLANETS.push({ name: 'Pluto', type: 'Dwarf planet (Kuiper Belt object)', diam: 2376, mass: '1.303×10²² kg',
  el: [39.48211675, 0.2488273, 17.14001206, 238.92903833, 224.06891629, 110.30393684], period: 90560, rot: -153.29, tilt: 122.53,
  temp: '−229 °C mean', atmo: 'Thin N₂, CH₄, CO; seasonally collapses far from the Sun', look: 'pluto',
  fact: 'NASA’s New Horizons flew past in July 2015 and found a vast nitrogen-ice plain, Sputnik Planitia.' });
EXTRA.Pluto = { g: 0.62, nMoons: 5, disc: '1930, Clyde Tombaugh (Lowell Observatory); classed a dwarf planet by the IAU in 2006' };
for (const p of PLANETS) Object.assign(p, EXTRA[p.name]);
MOONS.push(['Charon', 'Pluto', 19591, 6.3872, 606, [150, 140, 135], 'Pluto and Charon are tidally locked and their common centre of mass lies outside Pluto.']);
SUN.g = 274;

// Simplified visual comet models. el = [a, e, I, 0, longitude of perihelion, node]; tp = perihelion JD. Elements are approximate.
export const COMETS = [
 { name: 'Halley (1P)', type: 'Periodic comet (simplified visual model)', diam: 11, el: [17.834, 0.96714, 162.26, 0, 169.75, 58.42], tp: 2446470.96, period: 27503, rot: 52.8, tilt: null,
   temp: 'Varies with solar distance', atmo: 'Coma of gas and dust when active', disc: 'Recorded since antiquity; periodicity shown by Edmond Halley (1705)', fact: 'Last perihelion was February 1986; the next is expected in 2061.' },
 { name: 'Hale-Bopp (C/1995 O1)', type: 'Long-period comet (simplified visual model)', diam: 60, el: [186.5, 0.99508, 89.43, 0, 53.06, 282.47], tp: 2450539.64, period: 930000, rot: 11.35, tilt: null,
   temp: 'Varies with solar distance', atmo: 'Coma of gas and dust when active', disc: '1995, Alan Hale and Thomas Bopp', fact: 'Visible to the naked eye for about 18 months in 1996–1997.' },
 { name: 'Encke (2P)', type: 'Short-period comet (simplified visual model)', diam: 4.8, el: [2.2154, 0.8483, 11.78, 0, 161.12, 334.57], tp: 2460240.2, period: 1204, rot: 11, tilt: null,
   temp: 'Varies with solar distance', atmo: 'Weak coma', disc: 'Orbit identified by Johann Encke, 1819', fact: 'Has one of the shortest orbital periods of any known comet, about 3.3 years.' }
];
