import * as THREE from 'https://unpkg.com/three@0.166.1/build/three.module.js';

const peaks = [
  {rank:1,name:'Mount Everest',country:'Nepal / China',lat:27.9881,lon:86.9250,elev:8849,iso:20004,nhn:'No higher neighbour on Earth'},
  {rank:2,name:'Aconcagua',country:'Argentina',lat:-32.6532,lon:-70.0109,elev:6961,iso:16534,nhn:'Tirich Mir, Pakistan'},
  {rank:3,name:'Denali',country:'United States',lat:63.0695,lon:-151.0074,elev:6190,iso:7450,nhn:'Yanamax, China'},
  {rank:4,name:'Kilimanjaro',country:'Tanzania',lat:-3.0674,lon:37.3556,elev:5895,iso:5510,nhn:'Kuh-e Shashgal, Afghanistan'},
  {rank:5,name:'Puncak Jaya',country:'Indonesia',lat:-4.0833,lon:137.1833,elev:4884,iso:5262,nhn:'Jade Dragon Snow Mountain, China'},
  {rank:6,name:'Vinson Massif',country:'Antarctica',lat:-78.5254,lon:-85.6171,elev:4892,iso:4911,nhn:'Risco Plateado, Argentina'},
  {rank:7,name:'Mont Orohena',country:'French Polynesia',lat:-17.621,lon:-149.48,elev:2241,iso:4798,nhn:'Mauna Kea, Hawaiʻi'},
  {rank:8,name:'Mauna Kea',country:'United States',lat:19.8207,lon:-155.4681,elev:4207,iso:3947,nhn:'Mount Whitney, United States'},
  {rank:9,name:'Gunnbjørn Fjeld',country:'Greenland',lat:68.9197,lon:-29.9017,elev:3694,iso:3254,nhn:'Kebnekaise, Sweden'},
  {rank:10,name:'Aoraki / Mount Cook',country:'New Zealand',lat:-43.595,lon:170.142,elev:3724,iso:3140,nhn:'Puncak Jaya, Indonesia'},
  {rank:11,name:'Mount Elbrus',country:'Russia',lat:43.3499,lon:42.4453,elev:5642,iso:2473,nhn:'Damavand, Iran'},
  {rank:12,name:'Pico de Orizaba',country:'Mexico',lat:19.029,lon:-97.269,elev:5636,iso:2690,nhn:'Mount Logan, Canada'},
  {rank:13,name:'Mount Logan',country:'Canada',lat:60.567,lon:-140.405,elev:5959,iso:2169,nhn:'Denali, United States'},
  {rank:14,name:'Mount Damavand',country:'Iran',lat:35.955,lon:52.109,elev:5610,iso:1165,nhn:'Kuh-e Shashgal, Afghanistan'},
  {rank:15,name:'Mont Blanc',country:'France / Italy',lat:45.8326,lon:6.8652,elev:4808,iso:2812,nhn:'Kukurtlu Dome, Caucasus'}
];

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x020510, 0.08);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 1000);
camera.position.z = 4.2;
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#globe'), antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const earthGroup = new THREE.Group();
scene.add(earthGroup);
const tex = new THREE.TextureLoader().load('https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg');
const globe = new THREE.Mesh(new THREE.SphereGeometry(1.45, 96, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: .75, metalness: .05 }));
const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.47, 96, 96), new THREE.MeshBasicMaterial({ color: 0x75c9ff, transparent: true, opacity: .08, blending: THREE.AdditiveBlending }));
earthGroup.add(globe, atmosphere);
scene.add(new THREE.AmbientLight(0x8fb7ff, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 2.8);
sun.position.set(3, 1.5, 4);
scene.add(sun);

const interactive = [];
const byId = id => document.getElementById(id);
let selected = 1;

function v(lat, lon, r = 1.48) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function addPeak(p, index) {
  const marker = new THREE.Mesh(new THREE.SphereGeometry(p.rank === 1 ? .035 : .024, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
  marker.position.copy(v(p.lat, p.lon, 1.52));
  marker.userData.peakIndex = index;
  earthGroup.add(marker);
  interactive.push(marker);

  const ringR = Math.min(1.35, Math.max(.08, p.iso / 20004 * 1.45));
  const ring = new THREE.Mesh(new THREE.RingGeometry(ringR, ringR + .018, 192), new THREE.MeshBasicMaterial({ color: 0x3ddcff, transparent: true, opacity: p.rank < 7 ? .38 : .2, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  ring.position.copy(v(p.lat, p.lon, 1.505));
  ring.lookAt(new THREE.Vector3(0, 0, 0));
  ring.userData.peakIndex = index;
  earthGroup.add(ring);
  interactive.push(ring);
}

function update() {
  const p = peaks[selected];
  byId('name').textContent = p.name;
  byId('rank').textContent = `#${p.rank}`;
  byId('meta').textContent = `${p.country} · ${p.elev.toLocaleString()} m elevation · ${p.iso.toLocaleString()} km isolation`;
  byId('nhn').textContent = `Nearest higher neighbour: ${p.nhn}.`;
  byId('meter').style.width = `${Math.min(100, p.iso / 20004 * 100)}%`;
}

peaks.forEach(addPeak);
byId('peak-count').textContent = peaks.length;
byId('next').onclick = () => { selected = (selected + 1) % peaks.length; update(); };
update();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
function pick(clientX, clientY) {
  pointer.x = (clientX / innerWidth) * 2 - 1;
  pointer.y = -(clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(interactive, false)[0];
  if (!hit) return false;
  selected = hit.object.userData.peakIndex;
  update();
  return true;
}

let dragging = false, lastX = 0, lastY = 0, moved = false, vel = .0018;
addEventListener('pointerdown', e => { dragging = true; moved = false; lastX = e.clientX; lastY = e.clientY; });
addEventListener('pointerup', e => { if (!moved) pick(e.clientX, e.clientY); dragging = false; });
addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  moved = moved || Math.abs(dx) + Math.abs(dy) > 3;
  earthGroup.rotation.y += dx * .006;
  earthGroup.rotation.x += dy * .006;
  lastX = e.clientX;
  lastY = e.clientY;
});
addEventListener('wheel', e => { camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * .002, 2.4, 6.5); });
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
function animate() { requestAnimationFrame(animate); if (!dragging) earthGroup.rotation.y += vel; renderer.render(scene, camera); }
animate();
