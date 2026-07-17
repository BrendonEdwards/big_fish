const MAX_TILE_ZOOM = 19;
const SATELLITE_STYLE = {
  version: 8,
  projection: { type: 'globe' },
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

const summits = [
  { id: 'everest', name: 'Mount Everest', elevationM: 8848.86, coordinates: [86.925, 27.9881], nhn: null, isolationKm: 40075, notes: 'Highest point on Earth; isolation wraps the globe.' },
  { id: 'aconcagua', name: 'Aconcagua', elevationM: 6961, coordinates: [-70.0109, -32.6532], nhn: 'Tirich Mir', nhnCoordinates: [71.8409, 36.2553], isolationKm: 16534, notes: 'Highest summit outside Asia.' },
  { id: 'denali', name: 'Denali', elevationM: 6190, coordinates: [-151.0074, 63.0695], nhn: 'Aconcagua', nhnCoordinates: [-70.0109, -32.6532], isolationKm: 7450, notes: "North America's highest peak." },
  { id: 'kilimanjaro', name: 'Kilimanjaro', elevationM: 5895, coordinates: [37.3556, -3.0674], nhn: 'Mount Everest', nhnCoordinates: [86.925, 27.9881], isolationKm: 5510, notes: "Africa's highest free-standing volcanic mountain." },
  { id: 'elbrus', name: 'Mount Elbrus', elevationM: 5642, coordinates: [42.4453, 43.3499], nhn: 'Mount Everest', nhnCoordinates: [86.925, 27.9881], isolationKm: 2473, notes: "Europe's conventional high point." },
  { id: 'vinson', name: 'Vinson Massif', elevationM: 4892, coordinates: [-85.6171, -78.5254], nhn: 'Aconcagua', nhnCoordinates: [-70.0109, -32.6532], isolationKm: 4911, notes: "Antarctica's highest massif." },
  { id: 'puncak-jaya', name: 'Puncak Jaya', elevationM: 4884, coordinates: [137.1583, -4.0789], nhn: 'Mount Kinabalu', nhnCoordinates: [116.558, 6.075], isolationKm: 5262, notes: "Highest island peak in the world." },
];

const summitCollection = collection(summits.map((summit) => point(summit.coordinates, summit, summit.id)));
const nhnCollection = collection(summits.filter((summit) => summit.nhnCoordinates).map((summit) => point(summit.nhnCoordinates, {
  summitId: summit.id,
  name: summit.nhn,
  relatedSummit: summit.name,
})));
const arcCollection = collection(summits.filter((summit) => summit.nhnCoordinates).map((summit) => lineString(greatCircle(summit.coordinates, summit.nhnCoordinates), {
  summitId: summit.id,
  name: `${summit.name} → ${summit.nhn}`,
})));
const circleCollection = collection(summits.filter((summit) => summit.isolationKm < 10000).map((summit) => polygon([circle(summit.coordinates, summit.isolationKm)], {
  summitId: summit.id,
  name: `${summit.name} isolation`,
  isolationKm: summit.isolationKm,
})));

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
  map.addLayer({ id: 'summit-labels', type: 'symbol', source: 'summits', layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-offset': [0, 1.4], 'text-anchor': 'top' }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#07111f', 'text-halo-width': 1.2 } });

  ['summits', 'isolation-fill'].forEach((layerId) => {
    map.on('click', layerId, (event) => selectSummit(event.features[0].properties.summitId || event.features[0].properties.id));
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = ''; });
  });

  selectSummit('everest');
});

function selectSummit(summitId) {
  const summit = summits.find(({ id }) => id === summitId);
  if (!summit) return;
  for (const { id } of summits) map.setFeatureState({ source: 'summits', id }, { selected: id === summit.id });
  document.querySelector('#summit-name').textContent = summit.name;
  document.querySelector('#summit-elevation').textContent = `${summit.elevationM.toLocaleString()} m`;
  document.querySelector('#summit-nhn').textContent = summit.nhn ?? 'None — global high point';
  document.querySelector('#summit-isolation').textContent = `${summit.isolationKm.toLocaleString()} km`;
  document.querySelector('#summit-notes').textContent = summit.notes;
  activePopup?.remove();
  activePopup = new maplibregl.Popup({ closeButton: false, offset: 16 })
    .setLngLat(summit.coordinates)
    .setHTML(`<strong>${summit.name}</strong><br>${summit.elevationM.toLocaleString()} m`)
    .addTo(map);
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

function toRadians(degrees) { return (degrees * Math.PI) / 180; }
function toDegrees(radians) { return (radians * 180) / Math.PI; }
function wrapLongitude(longitude) { return ((((longitude + 180) % 360) + 360) % 360) - 180; }
