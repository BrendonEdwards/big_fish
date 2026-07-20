import { initRankings } from './rankings.js';
import { initMethodology } from './methodology.js';

const MAX_TILE_ZOOM = 19;
const SPOTLIGHT_OPACITY = 0.6;
const SATELLITE_STYLE = {
  version: 8,
  projection: { type: 'globe' },
  glyphs: '/fonts/{fontstack}/{range}.pbf',
  sources: {
    satellite: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: MAX_TILE_ZOOM,
      attribution: 'Tiles © Esri. Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
  },
  layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }],
};


const peakData = [
  { id: 'everest', name: 'Mount Everest', elevationM: 8848, latitude: 27.988333, longitude: 86.925278, isolationKm: null, nhn: null, notes: 'Highest point on Earth; isolation is undefined.' },
  { id: 'aconcagua', name: 'Aconcagua', elevationM: 6962, latitude: -32.653179, longitude: -70.010864, isolationKm: 16520, nhn: { name: 'Tirich Mir', latitude: 36.254167, longitude: 71.843333 }, notes: 'Highest summit outside Asia.' },
  { id: 'denali', name: 'Denali (Mount McKinley)', elevationM: 6194, latitude: 63.06917, longitude: -151.00639, isolationKm: 7450, nhn: { name: 'Yanamax', latitude: 61.86, longitude: 160.35 }, notes: "North America\'s highest isolated summit." },
  { id: 'kilimanjaro', name: 'Kilimanjaro', elevationM: 5895, latitude: -3.067425, longitude: 37.355627, isolationKm: 5510, nhn: { name: 'Kuh-e Shashgal', latitude: 36.525, longitude: 70.96 }, notes: "Africa\'s highest free-standing volcanic mountain." },
  { id: 'puncak-jaya', name: 'Puncak Jaya', elevationM: 4884, latitude: -4.078229, longitude: 137.157347, isolationKm: 5262, nhn: { name: 'Jade Dragon Snow Mountain', latitude: 27.1, longitude: 100.177 }, notes: 'Highest island peak in the world.' },
  { id: 'vinson', name: 'Vinson Massif', elevationM: 4892, latitude: -78.525483, longitude: -85.617147, isolationKm: 4861, nhn: { name: 'Risco Plateado', latitude: -34.93, longitude: -69.93 }, notes: 'Antarctica\'s highest massif.' },
  { id: 'orohena', name: 'Mont Orohena', elevationM: 2241, latitude: -17.621, longitude: -149.489, isolationKm: 4128, nhn: { name: 'Mount Ngauruhoe', latitude: -39.1568, longitude: 175.632 }, notes: 'High point of Tahiti.' },
  { id: 'mauna-kea', name: 'Mauna Kea', elevationM: 4205, latitude: 19.820667, longitude: -155.468056, isolationKm: 3947, nhn: { name: 'Mount Shasta', latitude: 41.4092, longitude: -122.1949 }, notes: 'Highest summit in Hawaii.' },
  { id: 'gunnbjorn', name: 'Gunnbjorn Fjeld', elevationM: 3694, latitude: 68.919, longitude: -29.898, isolationKm: 3254, nhn: { name: 'The Eiger', latitude: 46.5775, longitude: 8.0056 }, notes: 'Highest point in Greenland.' },
  { id: 'aoraki', name: 'Aoraki / Mount Cook', elevationM: 3754, latitude: -43.595, longitude: 170.141, isolationKm: 3140, nhn: { name: 'Mount Adam', latitude: -67.316, longitude: 50.416 }, notes: 'Highest mountain in New Zealand.' },
  { id: 'thabana-ntlenyana', name: 'Thabana Ntlenyana', elevationM: 3482, latitude: -29.467, longitude: 29.269, isolationKm: 3003, nhn: { name: 'Mount Meru', latitude: -3.2439, longitude: 36.75 }, notes: 'Highest point of Lesotho.' },
  { id: 'maunga-terevaka', name: 'Maunga Terevaka', elevationM: 506, latitude: -27.095, longitude: -109.374, isolationKm: 2836, nhn: { name: 'Cerro de Los Inocentes', latitude: -27.116, longitude: -68.816 }, notes: 'Highest point of Rapa Nui.' },
  { id: 'mont-blanc', name: 'Mont Blanc', elevationM: 4809, latitude: 45.8326, longitude: 6.8652, isolationKm: 2813, nhn: { name: 'Kukurtlu Dome', latitude: 43.344, longitude: 42.455 }, notes: 'Highest summit of the Alps.' },
  { id: 'piton-des-neiges', name: 'Piton des Neiges', elevationM: 3071, latitude: -21.099, longitude: 55.48, isolationKm: 2767, nhn: { name: 'Giant\'s Castle', latitude: -29.335, longitude: 29.483 }, notes: "High point of Réunion." },
  { id: 'klyuchevskaya', name: 'Klyuchevskaya Sopka', elevationM: 4750, latitude: 56.056, longitude: 160.642, isolationKm: 2748, nhn: { name: 'Mount Foraker', latitude: 62.96, longitude: -151.399 }, notes: 'Highest active volcano in Eurasia.' },
  { id: 'orizaba', name: 'Pico de Orizaba', elevationM: 5636, latitude: 19.029, longitude: -97.269, isolationKm: 2690, nhn: { name: 'Pico Cristobal Colon', latitude: 10.837, longitude: -73.686 }, notes: 'Highest volcano in North America.' },
  { id: 'queen-marys', name: 'Queen Mary\'s Peak', elevationM: 2060, latitude: -37.111, longitude: -12.288, isolationKm: 2665, nhn: { name: 'Mount Paget', latitude: -54.433, longitude: -36.55 }, notes: 'High point of Tristan da Cunha.' },
  { id: 'whitney', name: 'Mount Whitney', elevationM: 4421, latitude: 36.5786, longitude: -118.292, isolationKm: 2649, nhn: { name: 'Nevado de Toluca', latitude: 19.108, longitude: -99.758 }, notes: 'Highest summit in the contiguous United States.' },
  { id: 'kinabalu', name: 'Gunung Kinabalu', elevationM: 4095, latitude: 6.075, longitude: 116.558611, isolationKm: 2538, nhn: { name: 'Ngga Pilimsit', latitude: -4.043, longitude: 137.033 }, notes: 'Highest mountain in Borneo.' },
  { id: 'elbrus', name: 'Mount Elbrus', elevationM: 5642, latitude: 43.349938, longitude: 42.44533, isolationKm: 2473, nhn: { name: 'Pik Agasis', latitude: 43.1, longitude: 42.7 }, notes: 'Europe\'s conventional high point.' },
  { id: 'bandeira', name: 'Pico da Bandeira', elevationM: 2897, latitude: -20.435, longitude: -41.796, isolationKm: 2393, nhn: { name: 'Cerro Naranjos', latitude: -27.0, longitude: -68.5 }, notes: 'Prominent summit in eastern Brazil.' },
  { id: 'cameroon', name: 'Mont Cameroun', elevationM: 4040, latitude: 4.217, longitude: 9.172, isolationKm: 2338, nhn: { name: 'Mikeno', latitude: -1.463, longitude: 29.413 }, notes: 'Highest point of Cameroon.' },
  { id: 'paget', name: 'Mount Paget', elevationM: 2915, latitude: -54.433, longitude: -36.55, isolationKm: 2269, nhn: { name: 'Welch Mountains', latitude: -74.0, longitude: -62.0 }, notes: 'Highest summit of South Georgia.' },
  { id: 'silisili', name: 'Mauga Silisili', elevationM: 1858, latitude: -13.612, longitude: -172.504, isolationKm: 2245, nhn: { name: 'Tabwemasana', latitude: -15.389, longitude: 166.75 }, notes: 'Highest point of Samoa.' },
  { id: 'huascaran', name: 'Nevado Huascaran', elevationM: 6746, latitude: -9.121, longitude: -77.604, isolationKm: 2196, nhn: { name: 'Tres Cruces', latitude: -27.104, longitude: -68.789 }, notes: 'Highest mountain in Peru.' },
  { id: 'anamudi', name: 'Anamudi', elevationM: 2695, latitude: 10.169, longitude: 77.061, isolationKm: 2115, nhn: { name: 'Machapuchare', latitude: 28.495, longitude: 83.947 }, notes: 'Highest summit of the Western Ghats.' },
  { id: 'toubkal', name: 'Jebel Toubkal', elevationM: 4167, latitude: 31.061, longitude: -7.916, isolationKm: 2078, nhn: { name: 'Picco Luigi Amedeo', latitude: 0.386, longitude: 29.872 }, notes: 'Highest summit in the Atlas Mountains.' },
  { id: 'fuji', name: 'Mount Fuji', elevationM: 3776, latitude: 35.3606, longitude: 138.7274, isolationKm: 2077, nhn: { name: 'Xueshan', latitude: 24.383, longitude: 121.231 }, notes: 'Highest mountain in Japan.' },
  { id: 'emi-koussi', name: 'Emi Koussi', elevationM: 3445, latitude: 19.793, longitude: 18.551, isolationKm: 2001, nhn: { name: 'Mount Cameroon', latitude: 4.217, longitude: 9.172 }, notes: 'High point of the Tibesti Mountains.' },
  { id: 'mawson', name: 'Mawson Peak', elevationM: 2745, latitude: -53.106, longitude: 73.514, isolationKm: 1922, nhn: { name: 'Mount McMaster', latitude: -53.1, longitude: 73.45 }, notes: 'High point of Heard Island.' },
  { id: 'mitchell', name: 'Mount Mitchell', elevationM: 2037, latitude: 35.7647, longitude: -82.2653, isolationKm: 1913, nhn: { name: 'Lone Butte', latitude: 40.6, longitude: -111.7 }, notes: 'Highest summit in the eastern United States.' },
  { id: 'kerinci', name: 'Gunung Kerinci', elevationM: 3805, latitude: -1.697, longitude: 101.264, isolationKm: 1905, nhn: { name: 'Gunung Kinabalu', latitude: 6.075, longitude: 116.558611 }, notes: 'Highest volcano in Indonesia.' },
  { id: 'joes-hill', name: 'Joe\'s Hill', elevationM: 13, latitude: 1.8177, longitude: -157.3124, isolationKm: 1903, nhn: { name: 'Puu Ki', latitude: 20.0, longitude: -155.7 }, notes: 'High point of Kiritimati, the world\'s largest coral atoll.' },
  { id: 'agrihan', name: 'Agrihan High Point', elevationM: 965, latitude: 18.77, longitude: 145.67, isolationKm: 1902, nhn: { name: 'Mount Amagi', latitude: 34.86, longitude: 139.0 }, notes: 'Highest point in the Northern Mariana Islands.' },
  { id: 'kosciuszko', name: 'Mount Kosciuszko', elevationM: 2228, latitude: -36.4559, longitude: 148.2636, isolationKm: 1895, nhn: { name: 'Tutoko', latitude: -44.616, longitude: 168.005 }, notes: 'Highest mountain on mainland Australia.' },
  { id: 'olavtoppen', name: 'Olavtoppen', elevationM: 780, latitude: -54.42, longitude: 3.35, isolationKm: 1856, nhn: { name: 'Edinburgh Peak', latitude: -37.094, longitude: -12.283 }, notes: 'High point of Bouvet Island.' },
  { id: 'mascarin', name: 'Mascarin Peak', elevationM: 1230, latitude: -46.8928, longitude: 37.7339, isolationKm: 1848, nhn: { name: 'Cockscomb', latitude: 16.77, longitude: -88.67 }, notes: 'Highest point of Marion Island.' },
  { id: 'green-mountain', name: 'Green Mountain', elevationM: 859, latitude: -7.95, longitude: -14.35, isolationKm: 1842, nhn: { name: 'Mount Richard-Molard', latitude: 8.543, longitude: -7.56 }, notes: 'High point of Ascension Island.' },
  { id: 'gora-narodnaya', name: 'Gora Narodnaya', elevationM: 1895, latitude: 65.033, longitude: 60.117, isolationKm: 1836, nhn: { name: 'Kattotjokka', latitude: 68.0, longitude: 18.5 }, notes: 'Highest summit of the Ural Mountains.' },
  { id: 'yushan', name: 'Yushan', elevationM: 3952, latitude: 23.47, longitude: 120.957, isolationKm: 1815, nhn: { name: 'Peak 4030', latitude: 23.47, longitude: 121.03 }, notes: 'Highest summit in Taiwan.' },
];

const filterableIsolationValues = peakData.map((peak) => peak.isolationKm).filter(Number.isFinite);
const minFilterIsolationKm = Math.min(...filterableIsolationValues);
const maxFilterIsolationKm = Math.max(...filterableIsolationValues);

function setTerrainEnabled(enabled) {
  if (enabled) {
    if (!map.getSource('terrain-dem')) {
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256, encoding: 'terrarium', maxzoom: 13,
        attribution: 'Terrain: Mapzen/AWS Open Data Terrain Tiles',
      });
    }
    if (!map.getSource('hillshade-dem')) {
      map.addSource('hillshade-dem', {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256, encoding: 'terrarium', maxzoom: 13,
      });
    }
    map.setTerrain({ source: 'terrain-dem', exaggeration: 1.4 });
    if (!map.getLayer('hillshade')) {
      map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'hillshade-dem', paint: { 'hillshade-exaggeration': 0.35 } }, 'spotlight-dim');
    }
  } else {
    map.setTerrain(null);
    if (map.getLayer('hillshade')) map.removeLayer('hillshade');
  }
}

const summits = peakData.map((peak) => {
  const coordinates = location(peak.latitude, peak.longitude).coordinates;
  const nhnCoordinates = peak.nhn ? location(peak.nhn.latitude, peak.nhn.longitude).coordinates : null;
  return {
    id: peak.id,
    name: peak.name,
    elevationM: peak.elevationM,
    coordinates,
    nhn: peak.nhn?.name ?? null,
    nhnCoordinates,
    isolationKm: peak.isolationKm,
    notes: peak.notes,
  };
});

const summitCollection = collection(summits.map((summit) => point(summit.coordinates, summit, summit.id)));

let jailersData = null;
let displayMode = 'selected';
let hoveredWebSummitId = '';
let maximumIsolationKm = Infinity;

async function loadJailersData() {
  // Production serves public/* at the site root; the dev server serves the repo root.
  for (const base of ['/data', '/public/data']) {
    const response = await fetch(`${base}/jailers.json`).catch(() => null);
    if (response?.ok) return response.json();
  }
  console.warn('jailers.json unavailable, spokes and rings disabled');
  return null;
}

function spokeFeatures(summitId) {
  const summit = summits.find((entry) => entry.id === summitId);
  const data = jailersData?.summits?.[summitId];
  if (!summit || !data) return [];
  return data.jailers.map((jailer) => lineString(greatCircle(summit.coordinates, jailer.coordinates), {
    summitId,
    name: jailer.name,
    distanceKm: jailer.distanceKm,
    isNhn: jailer.name === data.nhn.name && jailer.distanceKm === data.nhn.distanceKm,
  }));
}

function spotlightMaskFeatures(summitId) {
  const ring = jailersData?.summits?.[summitId]?.ring;
  if (!ring) return [];
  // World rectangle with the ring's outer boundary(ies) punched out as holes,
  // so everything outside the ring dims. Aconcagua's ring already spans the
  // globe (a world-with-hole polygon), so its outer boundary punches the whole
  // world and nothing dims — correct: its dominion is essentially the planet.
  const holes = ring.type === 'MultiPolygon'
    ? ring.coordinates.map((polygon) => polygon[0])
    : [ring.coordinates[0]];
  const world = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];
  return [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [world, ...holes] } }];
}

function jailerPointFeatures(summitId) {
  const data = jailersData?.summits?.[summitId];
  if (!data) return [];
  return data.jailers.map((jailer) => point(jailer.coordinates, {
    summitId, name: jailer.name, elevationM: jailer.elevationM, distanceKm: jailer.distanceKm,
  }));
}

function summitPassesFilter(summit) {
  if (summit.id === 'everest') return true;
  return summit.isolationKm >= minimumIsolationKm && summit.isolationKm <= maximumIsolationKm;
}

function refreshOverlays() {
  if (!map.getSource('jailer-spokes')) return;
  if (displayMode === 'web') {
    const features = summits.filter(summitPassesFilter).flatMap((summit) => spokeFeatures(summit.id));
    map.getSource('jailer-spokes').setData(collection(features));
    map.getSource('jailer-ring').setData(collection([]));
    map.getSource('jailer-points').setData(collection([]));
    map.getSource('spotlight-mask').setData(collection([]));
    return;
  }
  const active = summits.find((summit) => summit.id === activeSummitId);
  const visible = active && summitPassesFilter(active);
  map.getSource('jailer-spokes').setData(collection(visible ? spokeFeatures(active.id) : []));
  const data = visible ? jailersData?.summits?.[active.id] : null;
  map.getSource('jailer-ring').setData(collection(
    data?.ring ? [{ type: 'Feature', properties: { summitId: active.id }, geometry: data.ring }] : [],
  ));
  map.getSource('spotlight-mask').setData(collection(visible && data?.ring ? spotlightMaskFeatures(active.id) : []));
  map.getSource('jailer-points').setData(collection(visible ? jailerPointFeatures(active.id) : []));
}

function setDisplayMode(mode) {
  displayMode = mode;
  const web = mode === 'web';
  map.setPaintProperty('spokes-core', 'line-opacity', web ? 0.25 : 0.9);
  map.setPaintProperty('spokes-glow-inner', 'line-opacity', web ? 0.1 : 0.25);
  map.setPaintProperty('spokes-glow-outer', 'line-opacity', web ? 0.04 : 0.1);
  map.setLayoutProperty('jailer-points', 'visibility', web ? 'none' : 'visible');
  map.setLayoutProperty('jailer-labels', 'visibility', web ? 'none' : 'visible');
  map.setFilter('spokes-core-hover', ['==', ['get', 'summitId'], '']);
  hoveredWebSummitId = '';
  if (web) activePopup?.remove();
  refreshOverlays();
}

const map = new maplibregl.Map({
  container: 'map',
  style: SATELLITE_STYLE,
  center: [20, 18],
  zoom: 1.3,
  maxZoom: MAX_TILE_ZOOM,
  renderWorldCopies: false,
  attributionControl: { compact: true },
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
map.scrollZoom.setWheelZoomRate(1 / 300);

let activePopup;
let activeSummitId = null;
let minimumIsolationKm = 0;

map.on('load', () => {
  map.setProjection({ type: 'globe' });
  map.addSource('summits', { type: 'geojson', data: summitCollection, promoteId: 'id' });

  map.addSource('jailer-spokes', { type: 'geojson', data: collection([]) });
  map.addSource('jailer-ring', { type: 'geojson', data: collection([]) });
  map.addSource('spotlight-mask', { type: 'geojson', data: collection([]) });
  map.addSource('jailer-points', { type: 'geojson', data: collection([]) });
  const spokeColor = ['interpolate', ['linear'], ['get', 'distanceKm'], 1500, '#ffb703', 6000, '#8ecae6', 12000, '#48b8ff'];
  map.addLayer({ id: 'ring-fill', type: 'fill', source: 'jailer-ring', paint: { 'fill-color': '#48b8ff', 'fill-opacity': 0.06 } });
  map.addLayer({ id: 'spotlight-dim', type: 'fill', source: 'spotlight-mask', paint: { 'fill-color': '#000000', 'fill-opacity': SPOTLIGHT_OPACITY } }, 'ring-fill');
  map.addLayer({ id: 'ring-outline', type: 'line', source: 'jailer-ring', paint: { 'line-color': '#48b8ff', 'line-width': 1.2, 'line-opacity': 0.7 } });
  map.addLayer({ id: 'spokes-glow-outer', type: 'line', source: 'jailer-spokes', layout: { 'line-cap': 'round' }, paint: { 'line-color': spokeColor, 'line-width': 10, 'line-opacity': 0.1, 'line-blur': 6 } });
  map.addLayer({ id: 'spokes-glow-inner', type: 'line', source: 'jailer-spokes', layout: { 'line-cap': 'round' }, paint: { 'line-color': spokeColor, 'line-width': 4.5, 'line-opacity': 0.25, 'line-blur': 2.5 } });
  map.addLayer({ id: 'spokes-core', type: 'line', source: 'jailer-spokes', layout: { 'line-cap': 'round' }, paint: { 'line-color': spokeColor, 'line-width': ['case', ['get', 'isNhn'], 3, 1.6], 'line-opacity': 0.9 } });
  map.addLayer({ id: 'spokes-core-hover', type: 'line', source: 'jailer-spokes', layout: { 'line-cap': 'round' }, filter: ['==', ['get', 'summitId'], ''], paint: { 'line-color': spokeColor, 'line-width': ['case', ['get', 'isNhn'], 4, 2.6], 'line-opacity': 1 } });
  map.addLayer({ id: 'jailer-points', type: 'circle', source: 'jailer-points', paint: { 'circle-color': '#ffb703', 'circle-radius': 4, 'circle-stroke-color': '#3a2500', 'circle-stroke-width': 1 } });
  map.addLayer({ id: 'jailer-labels', type: 'symbol', source: 'jailer-points', layout: { 'text-field': ['concat', ['get', 'name'], ' · ', ['to-string', ['get', 'elevationM']], ' m'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top' }, paint: { 'text-color': '#ffe0a3', 'text-halo-color': '#07111f', 'text-halo-width': 1.1 } });
  map.addLayer({ id: 'summits', type: 'circle', source: 'summits', paint: { 'circle-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ffd166', '#ff4d6d'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 5, 8, 12], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'summit-labels', type: 'symbol', source: 'summits', layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#07111f', 'text-halo-width': 1.2 } });

  loadJailersData().then((data) => {
    jailersData = data;
    refreshOverlays();
    const active = summits.find((summit) => summit.id === activeSummitId);
    if (active) renderJailerDetails(active);
  });

  map.on('click', (event) => {
    const feature = getPrioritizedInteractiveFeature(event.point);
    // promoteId moves a summit feature's id from properties.id to feature.id
    if (feature) selectSummit(feature.properties.summitId ?? feature.id ?? feature.properties.id);
  });

  map.on('mousemove', (event) => {
    const feature = getPrioritizedInteractiveFeature(event.point);
    map.getCanvas().style.cursor = feature ? 'pointer' : '';
    if (displayMode !== 'web') return;
    const hovered = map.queryRenderedFeatures(event.point, { layers: ['summits', 'spokes-core'] })[0];
    const summitId = hovered?.id ?? hovered?.properties?.summitId ?? '';
    if (summitId === hoveredWebSummitId) return;
    hoveredWebSummitId = summitId;
    map.setFilter('spokes-core-hover', ['==', ['get', 'summitId'], summitId]);
    map.setPaintProperty('spokes-core', 'line-opacity', summitId ? 0.08 : 0.25);
  });

  map.getCanvas().addEventListener('mouseleave', () => { map.getCanvas().style.cursor = ''; });
  bindIsolationFilter();
  applyIsolationFilter();

  for (const radio of document.querySelectorAll('input[name="display-mode"]')) {
    radio.addEventListener('change', () => setDisplayMode(radio.value));
  }

  document.querySelector('#terrain-toggle').addEventListener('change', (event) => setTerrainEnabled(event.target.checked));

  initRankings({
    getRows: () => {
      const base = summits.map((summit) => {
        const data = jailersData?.summits?.[summit.id];
        const ringAreaKm2 = data?.ringAreaKm2 ?? null;
        const raw = ringAreaKm2 && summit.elevationM > 0 ? ringAreaKm2 / summit.elevationM : null;
        return {
          id: summit.id, name: summit.name, isolationKm: summit.isolationKm,
          ringAreaKm2,
          jailerCount: data ? data.jailers.length : null,
          meanSpokeKm: data?.meanSpokeKm ?? null,
          underdogRaw: Number.isFinite(raw) && raw > 0 ? raw : null,
        };
      });
      const raws = base.map((row) => row.underdogRaw).filter((value) => value != null);
      const lnMin = Math.log(Math.min(...raws));
      const lnMax = Math.log(Math.max(...raws));
      const span = lnMax - lnMin;
      return base.map((row) => ({
        ...row,
        underdogIndex: row.underdogRaw == null ? null
          : span > 0 ? Math.round(100 * (Math.log(row.underdogRaw) - lnMin) / span) : 100,
      }));
    },
    onSelect: (id) => selectSummit(id),
  });

  initMethodology();

  const dashSequence = [
    [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  ];
  let dashStep = 0;
  window.setInterval(() => {
    dashStep = (dashStep + 1) % dashSequence.length;
    if (map.getLayer('spokes-core')) map.setPaintProperty('spokes-core', 'line-dasharray', dashSequence[dashStep]);
  }, 130);

  window.__bigfish = { map, selectSummit, setDisplayMode, setTerrainEnabled };
});

function selectSummit(summitId) {
  const summit = summits.find(({ id }) => id === summitId);
  if (!summit || !summitPassesFilter(summit)) return;
  activeSummitId = summit.id;
  for (const { id } of summits) map.setFeatureState({ source: 'summits', id }, { selected: id === summit.id });
  document.querySelector('#summit-name').textContent = summit.name;
  document.querySelector('#summit-elevation').textContent = `${summit.elevationM.toLocaleString()} m`;
  document.querySelector('#summit-notes').textContent = summit.notes;
  updateSelectedOverlays(summit);
  activePopup?.remove();
  activePopup = new maplibregl.Popup({ closeButton: false, offset: 16 })
    .setLngLat(summit.coordinates)
    .setHTML(`<strong>${summit.name}</strong><br>${summit.elevationM.toLocaleString()} m`)
    .addTo(map);
}

function getPrioritizedInteractiveFeature(point) {
  const features = map.queryRenderedFeatures(point, { layers: ['summits', 'ring-fill'] });
  return features.find((feature) => feature.layer.id === 'summits')
    ?? features.find((feature) => feature.layer.id === 'ring-fill')
    ?? null;
}

function bindIsolationFilter() {
  const minSlider = document.querySelector('#isolation-filter');
  const maxSlider = document.querySelector('#isolation-filter-max');
  const minValue = document.querySelector('#isolation-filter-value');
  const maxValue = document.querySelector('#isolation-filter-max-value');
  minimumIsolationKm = minFilterIsolationKm;
  maximumIsolationKm = maxFilterIsolationKm;
  const render = () => {
    minValue.textContent = `${minimumIsolationKm.toLocaleString()} km`;
    maxValue.textContent = `${maximumIsolationKm.toLocaleString()} km`;
  };
  render();
  minSlider.addEventListener('input', () => {
    if (Number(minSlider.value) > Number(maxSlider.value)) maxSlider.value = minSlider.value;
    minimumIsolationKm = isolationFromSlider(Number(minSlider.value));
    maximumIsolationKm = isolationFromSlider(Number(maxSlider.value));
    render();
    applyIsolationFilter();
  });
  maxSlider.addEventListener('input', () => {
    if (Number(maxSlider.value) < Number(minSlider.value)) minSlider.value = maxSlider.value;
    minimumIsolationKm = isolationFromSlider(Number(minSlider.value));
    maximumIsolationKm = isolationFromSlider(Number(maxSlider.value));
    render();
    applyIsolationFilter();
  });
}

function applyIsolationFilter() {
  // Filters evaluate against raw source properties, so ['get', 'id'] works here
  // even though promoteId strips id from queryRenderedFeatures output.
  const filter = ['any', ['==', ['get', 'id'], 'everest'], ['all',
    ['>=', ['get', 'isolationKm'], minimumIsolationKm],
    ['<=', ['get', 'isolationKm'], maximumIsolationKm],
  ]];
  if (map.getLayer('summits')) map.setFilter('summits', filter);
  if (map.getLayer('summit-labels')) map.setFilter('summit-labels', filter);
  const active = summits.find((summit) => summit.id === activeSummitId);
  if (!active || !summitPassesFilter(active)) {
    const replacement = summits.find((summit) => summit.id === 'everest') ?? summits.find(summitPassesFilter);
    if (replacement) selectSummit(replacement.id);
    else resetInfoPanel();
  }
  refreshOverlays();
}

function resetInfoPanel() {
  activeSummitId = null;
  activePopup?.remove();
  map.getSource('jailer-spokes')?.setData(collection([]));
  map.getSource('jailer-ring')?.setData(collection([]));
  map.getSource('spotlight-mask')?.setData(collection([]));
  map.getSource('jailer-points')?.setData(collection([]));
  document.querySelector('#summit-isolation').textContent = '–';
  document.querySelector('#summit-neighbours').textContent = '–';
  document.querySelector('#summit-area').textContent = '–';
  document.querySelector('#summit-mean-spoke').textContent = '–';
  document.querySelector('#jailer-chips').replaceChildren();
  document.querySelector('#summit-name').textContent = 'Select a summit';
  document.querySelector('#summit-elevation').textContent = '–';
  document.querySelector('#summit-nhn').textContent = '–';
  document.querySelector('#summit-notes').textContent = 'No summits match the current isolation filter.';
}

function isolationFromSlider(value) {
  const t = value / 1000;
  const isolation = Math.exp(Math.log(minFilterIsolationKm) + t * (Math.log(maxFilterIsolationKm) - Math.log(minFilterIsolationKm)));
  return Math.round(isolation);
}

function updateSelectedOverlays(summit) {
  refreshOverlays();
  renderJailerDetails(summit);
}

function renderJailerDetails(summit) {
  const data = jailersData?.summits?.[summit.id];
  if (summit.id === 'everest') {
    document.querySelector('#summit-isolation').textContent = '~38 million km (at closest approach)';
    document.querySelector('#summit-nhn').textContent = 'Maxwell Montes, Venus (~11 km)';
    document.querySelector('#summit-neighbours').textContent = '–';
    document.querySelector('#summit-area').textContent = '–';
    document.querySelector('#summit-mean-spoke').textContent = '–';
    document.querySelector('#summit-notes').textContent =
      'Nothing on Earth is higher, so Everest\'s nearest higher neighbour is off-world. '
      + 'Most people picture Mars and Olympus Mons (~22 km, the solar system\'s tallest), '
      + 'but Venus makes the closest planetary approaches to Earth (~38M km vs Mars\'s ~55M km), '
      + 'and its Maxwell Montes (~11 km) already tops Everest, so Venus, not Mars, holds the title.';
    document.querySelector('#jailer-chips').replaceChildren();
    return;
  }
  const isolation = document.querySelector('#summit-isolation');
  const neighbours = document.querySelector('#summit-neighbours');
  if (jailersData === null) {
    isolation.textContent = 'Isolation data unavailable';
    neighbours.textContent = '–';
  } else if (!data) {
    isolation.textContent = 'No higher neighbours';
    neighbours.textContent = '–';
  } else {
    isolation.textContent = `${Math.round(data.isolationKmComputed).toLocaleString()} km`;
    neighbours.textContent = `${data.jailers.length}`;
  }
  document.querySelector('#summit-nhn').textContent = data ? `${data.nhn.name} (${data.nhn.elevationM.toLocaleString()} m)` : (summit.id === 'everest' ? 'None, global high point' : summit.nhn ?? '–');
  document.querySelector('#summit-area').textContent = data?.ringAreaKm2 ? `${Math.round(data.ringAreaKm2).toLocaleString()} km²` : '–';
  document.querySelector('#summit-mean-spoke').textContent = data ? `${Math.round(data.meanSpokeKm).toLocaleString()} km` : '–';
  const chips = document.querySelector('#jailer-chips');
  chips.replaceChildren();
  if (!data) return;
  for (const jailer of [...data.jailers].sort((a, b) => a.distanceKm - b.distanceKm)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'jailer-chip';
    chip.textContent = `${jailer.name} · ${jailer.elevationM.toLocaleString()} m · ${Math.round(jailer.distanceKm).toLocaleString()} km`;
    chip.addEventListener('click', () => map.flyTo({ center: jailer.coordinates, zoom: 6 }));
    chips.append(chip);
  }
}

function location(latitude, longitude) {
  return {
    latitude,
    longitude,
    coordinates: [longitude, latitude],
  };
}

function point(coordinates, properties, id) {
  return { type: 'Feature', id, properties, geometry: { type: 'Point', coordinates } };
}

function lineString(coordinates, properties) {
  return { type: 'Feature', properties, geometry: { type: 'LineString', coordinates } };
}


function collection(features) {
  return { type: 'FeatureCollection', features };
}

function greatCircle(start, end, steps = 96) {
  const startVector = lonLatToVector(start);
  const endVector = lonLatToVector(end);
  const omega = Math.acos(dot(startVector, endVector));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const fraction = index / steps;
    const a = Math.sin((1 - fraction) * omega) / Math.sin(omega);
    const b = Math.sin(fraction * omega) / Math.sin(omega);
    return vectorToLonLat(startVector.map((value, axis) => a * value + b * endVector[axis]));
  });
}

function lonLatToVector([longitude, latitude]) {
  const lon = toRadians(longitude);
  const lat = toRadians(latitude);
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}

function vectorToLonLat([x, y, z]) {
  return [wrapLongitude(toDegrees(Math.atan2(y, x))), toDegrees(Math.atan2(z, Math.hypot(x, y)))];
}

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function distanceKm(start, end) {
  const [startLongitude, startLatitude] = start.map(toRadians);
  const [endLongitude, endLatitude] = end.map(toRadians);
  const deltaLatitude = endLatitude - startLatitude;
  const deltaLongitude = endLongitude - startLongitude;
  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees) { return (degrees * Math.PI) / 180; }
function toDegrees(radians) { return (radians * 180) / Math.PI; }
function wrapLongitude(longitude) { return ((((longitude + 180) % 360) + 360) % 360) - 180; }
