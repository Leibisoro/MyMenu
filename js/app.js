import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MindARThree } from 'mindar-image-three';

const DISHES = [
  { id: 'sushi', name: 'Salmon Sushi Roll', file: 'models/sushi.glb',
    desc: 'Fresh salmon, avocado, cucumber and sushi rice wrapped in seaweed. A perfect balance of flavor and freshness.',
    nutrition: { cal: 320, protein: 18, carbs: 38, fat: 10, sugar: 3, sodium: 480 },
    price: 12.99 },
  { id: 'ramen', name: 'Ramen Bowl', file: 'models/ramen.glb',
    desc: 'Rich tonkotsu broth with wheat noodles, soft-boiled egg, chashu pork and scallions.',
    nutrition: { cal: 550, protein: 28, carbs: 65, fat: 18, sugar: 4, sodium: 980 },
    price: 14.99 },
  { id: 'burger', name: 'Signature Burger', file: 'models/burger.glb',
    desc: 'Grilled beef patty, aged cheddar, caramelized onion and house sauce in a brioche bun.',
    nutrition: { cal: 680, protein: 34, carbs: 42, fat: 38, sugar: 8, sodium: 890 },
    price: 13.49 },
  { id: 'dimsum', name: 'Dim Sum Basket', file: 'models/dimsum.glb',
    desc: 'An assortment of steamed dumplings filled with shrimp, pork and vegetables.',
    nutrition: { cal: 410, protein: 20, carbs: 46, fat: 14, sugar: 3, sodium: 720 },
    price: 11.99 },
  { id: 'cake', name: 'Strawberry Cake', file: 'models/cake.glb',
    desc: 'Light sponge layered with fresh strawberries and whipped cream.',
    nutrition: { cal: 390, protein: 5, carbs: 52, fat: 16, sugar: 34, sodium: 180 },
    price: 8.99, scale: 0.75 },
];

const statusEl = document.getElementById('status');
const loadingEl = document.getElementById('loading');
const dotsEl = document.getElementById('dots');
const panelDesc = document.getElementById('panel-desc');
const panelNutrition = document.getElementById('panel-nutrition');
const panelPrice = document.getElementById('panel-price');
const pdTitle = document.getElementById('pd-title');
const pdText = document.getElementById('pd-text');
const nCal = document.getElementById('n-cal');
const nProtein = document.getElementById('n-protein');
const nCarbs = document.getElementById('n-carbs');
const nFat = document.getElementById('n-fat');
const nSugar = document.getElementById('n-sugar');
const nSodium = document.getElementById('n-sodium');
const ppPrice = document.getElementById('pp-price');
const svg = document.getElementById('connectors');
const svgNS = 'http://www.w3.org/2000/svg';

function makeConnector() {
  const line = document.createElementNS(svgNS, 'line');
  const dot = document.createElementNS(svgNS, 'circle');
  dot.setAttribute('r', '3');
  svg.appendChild(line);
  svg.appendChild(dot);
  return { line, dot };
}
const connDesc = makeConnector();
const connNutrition = makeConnector();
const connPrice = makeConnector();

function updateConnector(conn, panelEl, corner, targetX, targetY) {
  const r = panelEl.getBoundingClientRect();
  let px, py;
  if (corner === 'br') { px = r.right; py = r.bottom; }
  else if (corner === 'bl') { px = r.left; py = r.bottom; }
  else { px = r.right; py = r.top; }
  conn.line.setAttribute('x1', px);
  conn.line.setAttribute('y1', py);
  conn.line.setAttribute('x2', targetX);
  conn.line.setAttribute('y2', targetY);
  conn.dot.setAttribute('cx', targetX);
  conn.dot.setAttribute('cy', targetY);
}

DISHES.forEach((d, i) => {
  const dot = document.createElement('div');
  dot.className = 'dot' + (i === 0 ? ' active' : '');
  dotsEl.appendChild(dot);
});

const mindarThree = new MindARThree({
  container: document.querySelector('#container'),
  imageTargetSrc: 'marker/targets.mind',
  uiScanning: 'no',
  uiLoading: 'no',
});
const { renderer, scene, camera } = mindarThree;
renderer.outputColorSpace = THREE.SRGBColorSpace;

scene.add(new THREE.AmbientLight(0xfff2e0, 0.8));
const key = new THREE.DirectionalLight(0xffffff, 1.3);
key.position.set(2, 4, 4);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffe8cf, 0.6);
rim.position.set(-3, 2, -2);
scene.add(rim);

// anchor.group is positioned/oriented by MindAR to match the tracked marker each frame.
const anchor = mindarThree.addAnchor(0);
let markerFound = false;
anchor.onTargetFound = () => {
  statusEl.textContent = 'Marker: detected';
  statusEl.className = 'found';
  markerFound = true;
  animatePanelsIn();
};
anchor.onTargetLost = () => {
  statusEl.textContent = 'Marker: not detected';
  statusEl.className = 'lost';
  markerFound = false;
  animatePanelsOut();
};

function animatePanelsIn() {
  panelDesc.classList.add('show');
  setTimeout(() => panelNutrition.classList.add('show'), 150);
  setTimeout(() => panelPrice.classList.add('show'), 300);
}
function animatePanelsOut() {
  panelDesc.classList.remove('show');
  panelNutrition.classList.remove('show');
  panelPrice.classList.remove('show');
}

// userControl sits inside the anchor: drag-rotate / pinch-zoom apply here,
// on top of MindAR's own tracked pose, without fighting it.
const userControl = new THREE.Group();
anchor.group.add(userControl);

const dishGroup = new THREE.Group();
// Lay the group flat so models sit on top of the marker, viewed from above, centered on the marker.
dishGroup.rotation.x = Math.PI / 2;
userControl.add(dishGroup);

const loader = new GLTFLoader();
function loadGLB(url, scaleMult = 1) {
  return new Promise((resolve, reject) => {
    loader.load(url, gltf => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3(); box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scaleFix = (1.6 / maxDim) * scaleMult;
      model.scale.setScalar(scaleFix);
      const box2 = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3(); box2.getCenter(center);
      // Center horizontally on the marker, rest the base of the model at the marker plane (y=0)
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= box2.min.y;
      resolve(model);
    }, undefined, reject);
  });
}

const modelCache = {};
let currentIndex = 0;

async function getModel(index) {
  if (modelCache[index] !== undefined) return modelCache[index];
  try {
    const d = DISHES[index];
    const model = await loadGLB(d.file, d.scale || 1);
    modelCache[index] = model;
    return model;
  } catch (e) {
    console.error('Failed to load', DISHES[index].id, e);
    modelCache[index] = null;
    return null;
  }
}

async function showDish(index) {
  loadingEl.style.display = 'block';
  loadingEl.textContent = 'Loading ' + DISHES[index].name + '…';
  const model = await getModel(index);
  dishGroup.clear();
  if (model) dishGroup.add(model);
  loadingEl.style.display = 'none';

  const d = DISHES[index];
  pdTitle.textContent = d.name;
  pdText.textContent = d.desc;
  nCal.textContent = d.nutrition.cal + ' kcal';
  nProtein.textContent = d.nutrition.protein + ' g';
  nCarbs.textContent = d.nutrition.carbs + ' g';
  nFat.textContent = d.nutrition.fat + ' g';
  nSugar.textContent = d.nutrition.sugar + ' g';
  nSodium.textContent = d.nutrition.sodium + ' mg';
  ppPrice.textContent = '$' + d.price.toFixed(2);

  // re-trigger a quick stagger when switching dishes while already found
  if (markerFound) {
    animatePanelsOut();
    setTimeout(animatePanelsIn, 120);
  }

  currentIndex = index;
  userRotY = 0; userRotX = 0; userZoom = 1;
  applyUserTransform();
  [...dotsEl.children].forEach((d, i) => d.classList.toggle('active', i === index));
}
function nextDish() { showDish((currentIndex + 1) % DISHES.length); }
function prevDish() { showDish((currentIndex - 1 + DISHES.length) % DISHES.length); }

// ================= Gestures =================
let userRotY = 0, userRotX = 0, userZoom = 1;
let dragging = false, lastX = 0, lastY = 0, startX = 0, startY = 0, startT = 0;
let pinchStartDist = null, pinchStartZoom = 1;

function applyUserTransform() {
  userControl.rotation.y = userRotY;
  userControl.rotation.x = userRotX;
  userControl.scale.setScalar(userZoom);
}
function dist2(t0, t1) { const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY; return Math.sqrt(dx*dx + dy*dy); }

const surface = document.getElementById('container');
surface.addEventListener('pointerdown', e => {
  dragging = true; lastX = e.clientX; lastY = e.clientY; startX = e.clientX; startY = e.clientY; startT = performance.now();
});
window.addEventListener('pointerup', e => {
  if (dragging) {
    const totalDX = e.clientX - startX, totalDY = e.clientY - startY;
    const dt = performance.now() - startT;
    if (Math.abs(totalDX) > 70 && Math.abs(totalDX) > Math.abs(totalDY) * 1.5 && dt < 500) {
      if (totalDX < 0) nextDish(); else prevDish();
    }
  }
  dragging = false;
});
window.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  userRotY += dx * 0.008;
  userRotX = Math.max(-0.6, Math.min(0.6, userRotX + dy * 0.006));
  lastX = e.clientX; lastY = e.clientY;
  applyUserTransform();
});
surface.addEventListener('touchstart', e => {
  if (e.touches.length === 2) { pinchStartDist = dist2(e.touches[0], e.touches[1]); pinchStartZoom = userZoom; }
}, { passive: true });
surface.addEventListener('touchmove', e => {
  if (e.touches.length === 2 && pinchStartDist) {
    const d = dist2(e.touches[0], e.touches[1]);
    userZoom = Math.max(0.5, Math.min(2.5, pinchStartZoom * (d / pinchStartDist)));
    applyUserTransform();
  }
}, { passive: true });
surface.addEventListener('touchend', () => { pinchStartDist = null; });
surface.addEventListener('wheel', e => {
  e.preventDefault();
  userZoom = Math.max(0.5, Math.min(2.5, userZoom - e.deltaY * 0.001));
  applyUserTransform();
}, { passive: false });

// ================= Start =================
const anchorWorldPos = new THREE.Vector3();
function updateConnectors() {
  if (!markerFound) {
    svg.style.opacity = 0;
    return;
  }
  svg.style.opacity = 1;
  anchor.group.getWorldPosition(anchorWorldPos);
  const proj = anchorWorldPos.clone().project(camera);
  const sx = (proj.x + 1) / 2 * window.innerWidth;
  const sy = (1 - proj.y) / 2 * window.innerHeight;
  updateConnector(connDesc, panelDesc, 'br', sx, sy);
  updateConnector(connNutrition, panelNutrition, 'bl', sx, sy);
  updateConnector(connPrice, panelPrice, 'tr', sx, sy);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

(async () => {
  await showDish(0);
  await mindarThree.start();
  renderer.setAnimationLoop(() => {
    updateConnectors();
    renderer.render(scene, camera);
  });
})();
