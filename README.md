# Big Fish

Topographical isolation explorer for the 40 most topographically isolated summits on Earth. The app uses WGS84 longitude/latitude summit data with MapLibre GL JS rather than a custom `THREE.Scene`, `SphereGeometry`, and raycaster stack, so peak markers, nearest-higher-neighbour (NHN) points, isolation circles, and summit-to-NHN arcs are all rendered as geographically anchored map layers.

## Rendering path

This rewrite chooses **MapLibre GL JS** with globe projection, researched WGS84 summit locations converted to GeoJSON `[longitude, latitude]` coordinates, and Esri World Imagery raster satellite tiles. MapLibre provides native pan, pitch, rotation, wheel zoom, feature picking, and GeoJSON layer anchoring without requiring a Mapbox token.

## Local development

```bash
npm install
npm run dev
```

## Coordinate data

The 40 summit positions are the Wikipedia Topographic isolation table entries, with researched WGS84 latitude/longitude values and converted in code to GeoJSON `[longitude, latitude]` arrays. See `docs/coordinates.md` for the coordinate audit trail.

## Dominance cells

Clicking a summit shows its dominance cell: the doubled spherical-Voronoi
polygon whose boundary passes through the higher peaks that hem the summit
in. The cell's minimum boundary distance is the summit's isolation, and the
boundary touches the nearest higher neighbour. Cells are precomputed from
the GeoNames catalogue (peaks/mountains/volcanoes/hills with elevations; range/group features and stale elevations filtered out) —
coverage is thinnest near sea level, so low summits' cells reflect the
nearest higher *catalogued* peak. See
`docs/superpowers/specs/2026-07-18-voronoi-dominance-cells-design.md`.

To regenerate `public/data/cells/` (one-time ~400 MB GeoNames download,
cached in `scripts/.cache/`):

    /opt/homebrew/opt/python@3.12/bin/python3.12 -m venv scripts/.venv
    scripts/.venv/bin/pip install numpy shapely antimeridian pytest
    node scripts/export-summits.mjs
    scripts/.venv/bin/python scripts/build_cells.py

Validation report: `scripts/cell-report.md`. Tests:
`scripts/.venv/bin/pytest scripts/ -q` and `npm run smoke`.

## Token and tile configuration

The default style in `src/main.js` uses Esri World Imagery tiles and does not require a token. If you switch to Mapbox satellite tiles, set a Vercel environment variable such as `VITE_MAPBOX_TOKEN` and update the raster tile URL in `SATELLITE_STYLE` to include it. Keep client-side map tokens URL-restricted to your production domain and localhost development origins.

## Vercel deployment notes

1. Import the repository into Vercel.
2. Use build command `npm run build` and output directory `dist`. The build script validates the MapLibre configuration and copies the static files into `dist` for Vercel.
3. Add any provider token as a Vercel Project Environment Variable. If you later introduce a bundler, keep the public-client prefix convention for that tool (for example, `VITE_` with Vite).
4. Redeploy after changing map provider configuration or token restrictions.

## Zoom and overlay validation

The MapLibre map and raster source both set `maxZoom`/`maxzoom` to `19`, matching the provider's maximum tile zoom used by the app. Wheel zoom is enabled through MapLibre scroll zoom controls, and overlays are GeoJSON sources/layers, so markers, circles, and arcs are reprojected by the map engine and remain anchored to longitude/latitude coordinates at every zoom level.
