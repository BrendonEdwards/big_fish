const MAX_TILE_ZOOM = 19;
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
      attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
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
  { id: 'joes-hill', name: 'Joe\'s Hill', elevationM: 13, latitude: 32.25, longitude: -64.85, isolationKm: 1903, nhn: { name: 'Puu Ki', latitude: 20.0, longitude: -155.7 }, notes: 'High point of Bermuda.' },
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
const nhnCollection = collection(summits.filter((summit) => summit.nhnCoordinates).map((summit) => point(summit.nhnCoordinates, {
  summitId: summit.id,
  name: summit.nhn,
  relatedSummit: summit.name,
  isolationKm: summit.isolationKm,
})));
const arcCollection = collection([]);

const cellCache = new Map();
let overlayRequestToken = 0;

async function fetchCell(summitId) {
  if (summitId === 'everest') return null;
  if (!cellCache.has(summitId)) {
    const request = (async () => {
      // Production serves public/* at the site root; the dev server serves the repo root.
      for (const base of ['/data/cells', '/public/data/cells']) {
        const response = await fetch(`${base}/${summitId}.json`).catch(() => null);
        if (response?.ok) return response.json();
      }
      throw new Error(`No cell data for ${summitId}`);
    })().catch((error) => {
      console.warn(error);
      cellCache.delete(summitId);
      return null;
    });
    cellCache.set(summitId, request);
  }
  return cellCache.get(summitId);
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
  map.addSource('nhn-points', { type: 'geojson', data: nhnCollection });
  map.addSource('summit-arcs', { type: 'geojson', data: arcCollection });

  map.addSource('voronoi-cell', { type: 'geojson', data: collection([]) });
  map.addSource('cell-peaks', { type: 'geojson', data: collection([]) });
  map.addLayer({ id: 'voronoi-fill', type: 'fill', source: 'voronoi-cell', paint: { 'fill-color': '#48b8ff', 'fill-opacity': 0.08 } });
  map.addLayer({ id: 'voronoi-outline', type: 'line', source: 'voronoi-cell', paint: { 'line-color': '#48b8ff', 'line-width': 1.4, 'line-opacity': 0.85 } });
  map.addLayer({ id: 'summit-arcs', type: 'line', source: 'summit-arcs', paint: { 'line-color': '#ffd166', 'line-width': 2, 'line-opacity': 0.86 } });
  map.addLayer({ id: 'nhn-points', type: 'circle', source: 'nhn-points', paint: { 'circle-color': '#b8f7ff', 'circle-radius': 5, 'circle-stroke-color': '#07324a', 'circle-stroke-width': 1.5 } });
  map.addLayer({ id: 'cell-peaks', type: 'circle', source: 'cell-peaks', paint: { 'circle-color': '#ffb703', 'circle-radius': 4, 'circle-stroke-color': '#3a2500', 'circle-stroke-width': 1 } });
  map.addLayer({ id: 'cell-peak-labels', type: 'symbol', source: 'cell-peaks', layout: { 'text-field': ['concat', ['get', 'name'], ' · ', ['to-string', ['get', 'elevationM']], ' m'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-offset': [0, 1.1], 'text-anchor': 'top' }, paint: { 'text-color': '#ffe0a3', 'text-halo-color': '#07111f', 'text-halo-width': 1.1 } });
  map.addLayer({ id: 'summits', type: 'circle', source: 'summits', paint: { 'circle-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ffd166', '#ff4d6d'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 5, 8, 12], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
  map.addLayer({ id: 'summit-labels', type: 'symbol', source: 'summits', layout: { 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#07111f', 'text-halo-width': 1.2 } });

  map.on('click', (event) => {
    const feature = getPrioritizedInteractiveFeature(event.point);
    if (feature) selectSummit(feature.properties.summitId || feature.properties.id);
  });

  map.on('mousemove', (event) => {
    map.getCanvas().style.cursor = getPrioritizedInteractiveFeature(event.point) ? 'pointer' : '';
  });

  map.getCanvas().addEventListener('mouseleave', () => { map.getCanvas().style.cursor = ''; });
  bindIsolationFilter();
  applyIsolationFilter();
  window.__bigfish = { map, selectSummit };
});

function selectSummit(summitId) {
  const summit = summits.find(({ id }) => id === summitId);
  if (!summit || (summit.id !== 'everest' && summit.isolationKm < minimumIsolationKm)) return;
  activeSummitId = summit.id;
  for (const { id } of summits) map.setFeatureState({ source: 'summits', id }, { selected: id === summit.id });
  document.querySelector('#summit-name').textContent = summit.name;
  document.querySelector('#summit-elevation').textContent = `${summit.elevationM.toLocaleString()} m`;
  document.querySelector('#summit-nhn').textContent = summit.nhn ?? 'None — global high point';
  document.querySelector('#summit-isolation').textContent = summit.isolationKm ? `${summit.isolationKm.toLocaleString()} km` : 'Global high point';
  document.querySelector('#summit-notes').textContent = summit.notes;
  updateSelectedOverlays(summit);
  activePopup?.remove();
  activePopup = new maplibregl.Popup({ closeButton: false, offset: 16 })
    .setLngLat(summit.coordinates)
    .setHTML(`<strong>${summit.name}</strong><br>${summit.elevationM.toLocaleString()} m`)
    .addTo(map);
}

function getPrioritizedInteractiveFeature(point) {
  const features = map.queryRenderedFeatures(point, { layers: ['summits', 'voronoi-fill'] });
  return features.find((feature) => feature.layer.id === 'summits')
    ?? features.find((feature) => feature.layer.id === 'voronoi-fill')
    ?? null;
}

function bindIsolationFilter() {
  const slider = document.querySelector('#isolation-filter');
  const value = document.querySelector('#isolation-filter-value');
  slider.min = '0';
  slider.max = '1000';
  slider.value = '0';
  minimumIsolationKm = minFilterIsolationKm;
  value.textContent = `${minimumIsolationKm.toLocaleString()} km`;
  slider.addEventListener('input', () => {
    minimumIsolationKm = isolationFromSlider(Number(slider.value));
    value.textContent = `${minimumIsolationKm.toLocaleString()} km`;
    applyIsolationFilter();
  });
}

function applyIsolationFilter() {
  const filter = ['any', ['==', ['get', 'id'], 'everest'], ['>=', ['get', 'isolationKm'], minimumIsolationKm]];
  if (map.getLayer('summits')) map.setFilter('summits', filter);
  if (map.getLayer('summit-labels')) map.setFilter('summit-labels', filter);
  if (map.getLayer('nhn-points')) map.setFilter('nhn-points', ['>=', ['get', 'isolationKm'], minimumIsolationKm]);
  const active = summits.find((summit) => summit.id === activeSummitId);
  if (!active || active.isolationKm < minimumIsolationKm) {
    const replacement = summits.find((summit) => summit.id === 'everest') ?? summits.find((summit) => summit.isolationKm >= minimumIsolationKm);
    if (replacement) selectSummit(replacement.id);
    else resetInfoPanel();
  }
}

function resetInfoPanel() {
  activeSummitId = null;
  activePopup?.remove();
  map.getSource('voronoi-cell')?.setData(collection([]));
  map.getSource('cell-peaks')?.setData(collection([]));
  document.querySelector('#summit-computed').textContent = '—';
  map.getSource('summit-arcs')?.setData(collection([]));
  document.querySelector('#summit-name').textContent = 'Select a summit';
  document.querySelector('#summit-elevation').textContent = '—';
  document.querySelector('#summit-nhn').textContent = '—';
  document.querySelector('#summit-isolation').textContent = '—';
  document.querySelector('#summit-notes').textContent = 'No summits match the current isolation filter.';
}

function isolationFromSlider(value) {
  const t = value / 1000;
  const isolation = Math.exp(Math.log(minFilterIsolationKm) + t * (Math.log(maxFilterIsolationKm) - Math.log(minFilterIsolationKm)));
  return Math.round(isolation);
}

async function updateSelectedOverlays(summit) {
  const arcFeature = summit.nhnCoordinates
    ? lineString(greatCircle(summit.coordinates, summit.nhnCoordinates), { summitId: summit.id, name: `${summit.name} → ${summit.nhn}` })
    : null;
  map.getSource('summit-arcs')?.setData(collection(arcFeature ? [arcFeature] : []));

  const token = ++overlayRequestToken;
  const cell = await fetchCell(summit.id);
  if (token !== overlayRequestToken) return;
  const polygons = cell?.features.filter((feature) => feature.geometry.type !== 'Point') ?? [];
  const peaks = cell?.features.filter((feature) => feature.geometry.type === 'Point') ?? [];
  map.getSource('voronoi-cell')?.setData(collection(polygons));
  map.getSource('cell-peaks')?.setData(collection(peaks));
  const computed = document.querySelector('#summit-computed');
  if (polygons.length) {
    const properties = polygons[0].properties;
    computed.textContent = `${Math.round(properties.computedIsolationKm).toLocaleString()} km · ${properties.contributingPeakCount} shaping peaks`;
  } else {
    computed.textContent = summit.id === 'everest' ? 'No cell — nothing higher' : 'Unavailable';
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

function polygon(coordinates, properties) {
  return { type: 'Feature', properties, geometry: { type: 'Polygon', coordinates } };
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
