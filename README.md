# Big Fish

Topographical isolation explorer for notable high-prominence peaks. The app uses WGS84 longitude/latitude summit data with MapLibre GL JS rather than a custom `THREE.Scene`, `SphereGeometry`, and raycaster stack, so peak markers, nearest-higher-neighbour (NHN) points, isolation circles, and summit-to-NHN arcs are all rendered as geographically anchored map layers.

## Rendering path

This rewrite chooses **MapLibre GL JS** with globe projection, WGS84 `[longitude, latitude]` GeoJSON coordinates, and Esri World Imagery raster satellite tiles. MapLibre provides native pan, pitch, rotation, wheel zoom, feature picking, and GeoJSON layer anchoring without requiring a Mapbox token.

## Local development

```bash
npm install
npm run dev
```

## Token and tile configuration

The default style in `src/main.js` uses Esri World Imagery tiles and does not require a token. If you switch to Mapbox satellite tiles, set a Vercel environment variable such as `VITE_MAPBOX_TOKEN` and update the raster tile URL in `SATELLITE_STYLE` to include it. Keep client-side map tokens URL-restricted to your production domain and localhost development origins.

## Vercel deployment notes

1. Import the repository into Vercel.
2. Use build command `npm run build` and output directory `dist`. The build script validates the MapLibre configuration and copies the static files into `dist` for Vercel.
3. Add any provider token as a Vercel Project Environment Variable. If you later introduce a bundler, keep the public-client prefix convention for that tool (for example, `VITE_` with Vite).
4. Redeploy after changing map provider configuration or token restrictions.

## Zoom and overlay validation

The MapLibre map and raster source both set `maxZoom`/`maxzoom` to `19`, matching the provider's maximum tile zoom used by the app. Wheel zoom is enabled through MapLibre scroll zoom controls, and overlays are GeoJSON sources/layers, so markers, circles, and arcs are reprojected by the map engine and remain anchored to longitude/latitude coordinates at every zoom level.
