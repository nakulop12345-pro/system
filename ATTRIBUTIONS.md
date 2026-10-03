# Attributions

## External image textures: none are bundled
No third-party image is included in this release. I could not download or verify the licence of any texture in the build environment, and the rule for this project is that unverified assets are not used. Every surface is generated procedurally.

The texture system is ready for real maps. A file is used only if it is listed in `assets/textures/manifest.json`; if it fails to load, the procedural texture stays.

Expected file names: `mercury.jpg venus.jpg mars.jpg jupiter.jpg saturn.jpg uranus.jpg neptune.jpg pluto.jpg earth_day.jpg earth_night.jpg earth_clouds.jpg saturn_ring.png` (radial 1-D strip with alpha) and lowercase moon names such as `moon.jpg`, `io.jpg`, `titan.jpg`. All maps are equirectangular, 1k-4k wide.

### Candidate sources (NOT yet verified or used)
Check each individual asset's page for its licence and credit line before adding it:
- USGS Astrogeology Science Center map catalogue (planetary/lunar mosaics)
- NASA Visible Earth and NASA Scientific Visualization Studio (Earth, clouds, night lights); check the credit line on each item
- NASA/JPL-Caltech and NASA PDS image products (Cassini, Voyager, New Horizons)

### Record template (add one per asset used)
```
Asset:
Source (direct page URL):
Creator:
License:
Attribution required:
Where used:
```

## Scientific data (typed in by hand, rounded)
- E. M. Standish, NASA/JPL SSD, "Keplerian Elements for Approximate Positions of the Major Planets" (J2000), including Pluto - https://ssd.jpl.nasa.gov/planets/approx_pos.html
- NASA Planetary Fact Sheet (NSSDCA) - https://nssdc.gsfc.nasa.gov/planetary/factsheet/
- JPL SSD planetary satellite tables - https://ssd.jpl.nasa.gov/sats/
- Comet elements (Halley, Hale-Bopp, Encke): approximate values from JPL Small-Body Database; simplified visual models only. Verify before citing.
Moon counts change as discoveries are confirmed. This project is not affiliated with or endorsed by NASA, ESA or JPL.

## Software
- Three.js r160 with `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass` and `OrbitControls` (examples/jsm) - MIT licence - loaded from cdn.jsdelivr.net - https://threejs.org

## Approximations
Planets and Pluto: J2000 Keplerian elements advanced by mean motion, no secular rates. Moons: circular orbits, arbitrary phases. Comets: approximate elements, heuristic particle tails. Asteroid and Kuiper belts: seeded visual distributions (Kirkwood gaps and a Pluto-resonance clump are included). Eclipse view: educational alignment only. Distances and light times use the simplified model.
