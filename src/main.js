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
  { id: 'everest', name: 'Mount Everest', elevationM: 8848.86, latitude: 27.988333, longitude: 86.925278, parent: null, notes: 'Highest point on Earth; isolation wraps the globe.' },
  { id: 'k2', name: 'K2', elevationM: 8611, latitude: 35.880833, longitude: 76.515833, parent: 'Mount Everest', notes: 'Highest summit of the Karakoram.' },
  { id: 'kangchenjunga', name: 'Kangchenjunga', elevationM: 8586, latitude: 27.7025, longitude: 88.1475, parent: 'Mount Everest', notes: 'Highest summit in India and third-highest on Earth.' },
  { id: 'lhotse', name: 'Lhotse', elevationM: 8516, latitude: 27.961667, longitude: 86.933056, parent: 'Mount Everest', notes: 'Connected to Everest by the South Col.' },
  { id: 'makalu', name: 'Makalu', elevationM: 8485, latitude: 27.889722, longitude: 87.088889, parent: 'Mount Everest', notes: 'Fifth-highest mountain on Earth.' },
  { id: 'cho-oyu', name: 'Cho Oyu', elevationM: 8188, latitude: 28.094167, longitude: 86.660833, parent: 'Mount Everest', notes: 'Major Mahalangur Himalaya summit west of Everest.' },
  { id: 'dhaulagiri-i', name: 'Dhaulagiri I', elevationM: 8167, latitude: 28.696667, longitude: 83.493333, parent: 'K2', notes: 'Highest summit wholly within Nepal.' },
  { id: 'manaslu', name: 'Manaslu', elevationM: 8163, latitude: 28.549444, longitude: 84.559722, parent: 'Cho Oyu', notes: 'High point of the Manaslu Himalaya.' },
  { id: 'nanga-parbat', name: 'Nanga Parbat', elevationM: 8126, latitude: 35.2375, longitude: 74.589167, parent: 'Dhaulagiri I', notes: 'Western anchor of the Himalayan eight-thousanders.' },
  { id: 'annapurna-i', name: 'Annapurna I', elevationM: 8091, latitude: 28.595833, longitude: 83.820278, parent: 'Cho Oyu', notes: 'High point of the Annapurna massif.' },
  { id: 'gasherbrum-i', name: 'Gasherbrum I', elevationM: 8080, latitude: 35.724583, longitude: 76.696389, parent: 'K2', notes: 'Also known as Hidden Peak.' },
  { id: 'broad-peak', name: 'Broad Peak', elevationM: 8051, latitude: 35.810556, longitude: 76.568333, parent: 'Gasherbrum I', notes: 'Eight-thousander near K2.' },
  { id: 'gasherbrum-ii', name: 'Gasherbrum II', elevationM: 8035, latitude: 35.758333, longitude: 76.653333, parent: 'Gasherbrum I', notes: 'Karakoram eight-thousander in the Gasherbrum group.' },
  { id: 'shishapangma', name: 'Shishapangma', elevationM: 8027, latitude: 28.352222, longitude: 85.779722, parent: 'Cho Oyu', notes: 'The only eight-thousander wholly in Tibet.' },
  { id: 'gyachung-kang', name: 'Gyachung Kang', elevationM: 7952, latitude: 28.098333, longitude: 86.742, parent: 'Cho Oyu', notes: 'Highest summit below 8,000 metres.' },
  { id: 'annapurna-ii', name: 'Annapurna II', elevationM: 7937, latitude: 28.539722, longitude: 84.121944, parent: 'Annapurna I', notes: 'Eastern anchor of the Annapurna massif.' },
  { id: 'gasherbrum-iv', name: 'Gasherbrum IV', elevationM: 7932, latitude: 35.759, longitude: 76.616, parent: 'Gasherbrum II', notes: 'Steep summit in the Gasherbrum group.' },
  { id: 'himalchuli', name: 'Himalchuli', elevationM: 7893, latitude: 28.436389, longitude: 84.639444, parent: 'Manaslu', notes: 'Prominent Manaslu Himalaya summit.' },
  { id: 'distaghil-sar', name: 'Distaghil Sar', elevationM: 7884, latitude: 36.325278, longitude: 75.188333, parent: 'K2', notes: 'Highest mountain of the Hispar Muztagh.' },
  { id: 'ngadi-chuli', name: 'Ngadi Chuli', elevationM: 7871, latitude: 28.503333, longitude: 84.566667, parent: 'Manaslu', notes: 'Also known as Peak 29.' },
  { id: 'khunyang-chhish', name: 'Khunyang Chhish', elevationM: 7823, latitude: 36.200833, longitude: 75.207222, parent: 'Distaghil Sar', notes: 'High Hispar Karakoram summit.' },
  { id: 'masherbrum', name: 'Masherbrum', elevationM: 7821, latitude: 35.6425, longitude: 76.305556, parent: 'Gasherbrum I', notes: 'Also known as K1.' },
  { id: 'nanda-devi', name: 'Nanda Devi', elevationM: 7817, latitude: 30.375278, longitude: 79.970833, parent: 'Dhaulagiri I', notes: 'High point of the Garhwal Himalaya.' },
  { id: 'chomo-lonzo', name: 'Chomo Lonzo', elevationM: 7804, latitude: 27.929722, longitude: 87.108333, parent: 'Makalu', notes: 'Tibetan summit north-east of Makalu.' },
  { id: 'batura-sar', name: 'Batura Sar', elevationM: 7795, latitude: 36.506389, longitude: 74.522778, parent: 'Distaghil Sar', notes: 'Highest summit of the Batura Muztagh.' },
  { id: 'rakaposhi', name: 'Rakaposhi', elevationM: 7788, latitude: 36.1425, longitude: 74.489167, parent: 'Khunyang Chhish', notes: 'Prominent Karakoram peak above the Hunza valley.' },
  { id: 'namcha-barwa', name: 'Namcha Barwa', elevationM: 7782, latitude: 29.630833, longitude: 95.055278, parent: 'Kangchenjunga', notes: 'Eastern Himalayan high point near the Yarlung Tsangpo bend.' },
  { id: 'kanjut-sar', name: 'Kanjut Sar', elevationM: 7760, latitude: 36.205, longitude: 75.416, parent: 'Khunyang Chhish', notes: 'Hispar Karakoram summit.' },
  { id: 'kamet', name: 'Kamet', elevationM: 7756, latitude: 30.920278, longitude: 79.591667, parent: 'Nanda Devi', notes: 'Major Garhwal Himalaya summit.' },
  { id: 'dhaulagiri-ii', name: 'Dhaulagiri II', elevationM: 7751, latitude: 28.764167, longitude: 83.388889, parent: 'Dhaulagiri I', notes: 'Second-highest summit of the Dhaulagiri Himalaya.' },
  { id: 'saltoro-kangri', name: 'Saltoro Kangri', elevationM: 7742, latitude: 35.399167, longitude: 76.847222, parent: 'Gasherbrum I', notes: 'High point of the Saltoro Karakoram.' },
  { id: 'jannu', name: 'Jannu', elevationM: 7711, latitude: 27.681389, longitude: 88.044167, parent: 'Kangchenjunga', notes: 'Also known as Kumbhakarna.' },
  { id: 'tirich-mir', name: 'Tirich Mir', elevationM: 7708, latitude: 36.254167, longitude: 71.843333, parent: 'Batura Sar', notes: 'Highest summit of the Hindu Kush.' },
  { id: 'gurla-mandhata', name: 'Gurla Mandhata', elevationM: 7694, latitude: 30.445833, longitude: 81.295278, parent: 'Dhaulagiri I', notes: 'High summit near Lake Manasarovar.' },
  { id: 'saser-kangri-i', name: 'Saser Kangri I', elevationM: 7672, latitude: 34.866, longitude: 77.753, parent: 'Gasherbrum I', notes: 'High point of the Saser Muztagh.' },
  { id: 'chogolisa', name: 'Chogolisa', elevationM: 7665, latitude: 35.613611, longitude: 76.574, parent: 'Gasherbrum I', notes: 'Masherbrum Karakoram summit.' },
  { id: 'kongur-tagh', name: 'Kongur Tagh', elevationM: 7649, latitude: 38.593056, longitude: 75.313889, parent: 'Distaghil Sar', notes: 'Highest summit of the Kongur Shan.' },
  { id: 'shispare', name: 'Shispare', elevationM: 7611, latitude: 36.44, longitude: 74.681111, parent: 'Batura Sar', notes: 'Batura Muztagh summit.' },
  { id: 'trivor', name: 'Trivor', elevationM: 7577, latitude: 36.287778, longitude: 75.084444, parent: 'Distaghil Sar', notes: 'Hispar Karakoram summit.' },
  { id: 'gangkhar-puensum', name: 'Gangkhar Puensum', elevationM: 7570, latitude: 28.047222, longitude: 90.455833, parent: 'Kangchenjunga', notes: 'Highest unclimbed mountain commonly cited.' },
];

const byName = new Map(peakData.map((peak) => [peak.name, peak]));
const summits = peakData.map((peak) => {
  const parent = byName.get(peak.parent);
  const coordinates = location(peak.latitude, peak.longitude).coordinates;
  const nhnCoordinates = parent ? location(parent.latitude, parent.longitude).coordinates : null;
  return {
    id: peak.id,
    name: peak.name,
    elevationM: peak.elevationM,
    coordinates,
    nhn: parent?.name ?? null,
    nhnCoordinates,
    isolationKm: parent ? Math.round(distanceKm(coordinates, nhnCoordinates)) : 40075,
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
const circleCollection = collection([]);

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
const labelMarkers = new Map();

map.on('load', () => {
  map.setProjection({ type: 'globe' });
  map.addSource('summits', { type: 'geojson', data: summitCollection, promoteId: 'id' });
  map.addSource('nhn-points', { type: 'geojson', data: nhnCollection });
  map.addSource('isolation-circles', { type: 'geojson', data: circleCollection });
  map.addSource('summit-arcs', { type: 'geojson', data: arcCollection });

  map.addLayer({ id: 'isolation-fill', type: 'fill', source: 'isolation-circles', paint: { 'fill-color': '#48b8ff', 'fill-opacity': 0.07 } });
  map.addLayer({ id: 'isolation-outline', type: 'line', source: 'isolation-circles', paint: { 'line-color': '#48b8ff', 'line-width': 1.4, 'line-opacity': 0.85 } });
  map.addLayer({ id: 'summit-arcs', type: 'line', source: 'summit-arcs', paint: { 'line-color': '#ffd166', 'line-width': 2, 'line-opacity': 0.86 } });
  map.addLayer({ id: 'nhn-points', type: 'circle', source: 'nhn-points', paint: { 'circle-color': '#b8f7ff', 'circle-radius': 5, 'circle-stroke-color': '#07324a', 'circle-stroke-width': 1.5 } });
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
  createHtmlFallbackLabels();
  bindIsolationFilter();
  applyIsolationFilter();
});

function selectSummit(summitId) {
  const summit = summits.find(({ id }) => id === summitId);
  if (!summit || summit.isolationKm < minimumIsolationKm) return;
  activeSummitId = summit.id;
  for (const { id } of summits) map.setFeatureState({ source: 'summits', id }, { selected: id === summit.id });
  document.querySelector('#summit-name').textContent = summit.name;
  document.querySelector('#summit-elevation').textContent = `${summit.elevationM.toLocaleString()} m`;
  document.querySelector('#summit-nhn').textContent = summit.nhn ?? 'None — global high point';
  document.querySelector('#summit-isolation').textContent = `${summit.isolationKm.toLocaleString()} km`;
  document.querySelector('#summit-notes').textContent = summit.notes;
  updateSelectedOverlays(summit);
  activePopup?.remove();
  activePopup = new maplibregl.Popup({ closeButton: false, offset: 16 })
    .setLngLat(summit.coordinates)
    .setHTML(`<strong>${summit.name}</strong><br>${summit.elevationM.toLocaleString()} m`)
    .addTo(map);
}

function getPrioritizedInteractiveFeature(point) {
  const features = map.queryRenderedFeatures(point, { layers: ['summits', 'isolation-fill'] });
  return features.find((feature) => feature.layer.id === 'summits')
    ?? features.find((feature) => feature.layer.id === 'isolation-fill')
    ?? null;
}

function createHtmlFallbackLabels() {
  for (const summit of summits) {
    const label = document.createElement('button');
    label.className = 'summit-html-label';
    label.type = 'button';
    label.textContent = summit.name;
    label.addEventListener('click', () => selectSummit(summit.id));
    const marker = new maplibregl.Marker({ element: label, anchor: 'top', offset: [0, 14] })
      .setLngLat(summit.coordinates)
      .addTo(map);
    labelMarkers.set(summit.id, marker);
  }
}

function bindIsolationFilter() {
  const slider = document.querySelector('#isolation-filter');
  const value = document.querySelector('#isolation-filter-value');
  slider.max = String(Math.max(...summits.map((summit) => summit.isolationKm)));
  slider.addEventListener('input', () => {
    minimumIsolationKm = Number(slider.value);
    value.textContent = `${minimumIsolationKm.toLocaleString()} km`;
    applyIsolationFilter();
  });
}

function applyIsolationFilter() {
  const filter = ['>=', ['get', 'isolationKm'], minimumIsolationKm];
  if (map.getLayer('summits')) map.setFilter('summits', filter);
  if (map.getLayer('summit-labels')) map.setFilter('summit-labels', filter);
  if (map.getLayer('nhn-points')) map.setFilter('nhn-points', filter);
  for (const summit of summits) {
    const markerElement = labelMarkers.get(summit.id)?.getElement();
    if (markerElement) markerElement.hidden = summit.isolationKm < minimumIsolationKm;
  }
  const active = summits.find((summit) => summit.id === activeSummitId);
  if (!active || active.isolationKm < minimumIsolationKm) {
    const replacement = summits.find((summit) => summit.isolationKm >= minimumIsolationKm);
    if (replacement) selectSummit(replacement.id);
    else resetInfoPanel();
  }
}

function resetInfoPanel() {
  activeSummitId = null;
  activePopup?.remove();
  map.getSource('isolation-circles')?.setData(collection([]));
  map.getSource('summit-arcs')?.setData(collection([]));
  document.querySelector('#summit-name').textContent = 'Select a summit';
  document.querySelector('#summit-elevation').textContent = '—';
  document.querySelector('#summit-nhn').textContent = '—';
  document.querySelector('#summit-isolation').textContent = '—';
  document.querySelector('#summit-notes').textContent = 'No summits match the current isolation filter.';
}

function updateSelectedOverlays(summit) {
  const circleFeature = summit.isolationKm < 10000
    ? polygon([circle(summit.coordinates, summit.isolationKm)], { summitId: summit.id, name: `${summit.name} isolation`, isolationKm: summit.isolationKm })
    : null;
  const arcFeature = summit.nhnCoordinates
    ? lineString(greatCircle(summit.coordinates, summit.nhnCoordinates), { summitId: summit.id, name: `${summit.name} → ${summit.nhn}` })
    : null;
  map.getSource('isolation-circles')?.setData(collection(circleFeature ? [circleFeature] : []));
  map.getSource('summit-arcs')?.setData(collection(arcFeature ? [arcFeature] : []));
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

function circle(center, radiusKm, steps = 192) {
  const [longitude, latitude] = center.map(toRadians);
  const angularDistance = radiusKm / 6371.0088;
  const ring = Array.from({ length: steps + 1 }, (_, index) => {
    const bearing = (2 * Math.PI * index) / steps;
    const lat = Math.asin(Math.sin(latitude) * Math.cos(angularDistance) + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing));
    const lon = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude), Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(lat));
    return [wrapLongitude(toDegrees(lon)), toDegrees(lat)];
  });
  return ring;
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
