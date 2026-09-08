import * as THREE from "three";
import { CameraRig } from "./camera.js";
import { SolarSystem } from "./solarSystem.js";
import { UIController } from "./ui.js";

const canvas = document.getElementById("scene-canvas");
function detectQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const isSmallScreen = window.innerWidth < 720;
  const dpr = window.devicePixelRatio || 1;
  if (cores <= 4 && (isSmallScreen || dpr > 2)) return "low";
  return "high";
}
const quality = detectQuality();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === "low" ? 1.5 : 2));
renderer.setClearColor(0xf7f6f2, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf7f6f2, 420, 900);

const cameraRig = new CameraRig(canvas);
const solarSystem = new SolarSystem(scene, quality);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDownPos = null;

function getPointerNDC(event) {
  const rect = canvas.getBoundingClientRect();
  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  return { clientX, clientY };
}

canvas.addEventListener("pointerdown", (e) => {
  pointerDownPos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener("pointerup", (e) => {
  if (!pointerDownPos) return;
  const dx = e.clientX - pointerDownPos.x;
  const dy = e.clientY - pointerDownPos.y;
  const moved = Math.sqrt(dx * dx + dy * dy);
  pointerDownPos = null;
  if (moved > 6) return;

  getPointerNDC(e);
  raycaster.setFromCamera(pointer, cameraRig.camera);
  const intersects = raycaster.intersectObjects(solarSystem.selectable, false);
  if (intersects.length > 0) {
    const id = intersects[0].object.userData.id;
    selectObject(id);
  }
});

function selectObject(id) {
  const worldPos = solarSystem.getWorldPosition(id);
  const visualRadius = solarSystem.getVisualRadius(id);
  const focusDistance = Math.max(visualRadius * 6.5, 14);
  cameraRig.focusOn(worldPos, focusDistance);
  ui.openPanel(id);
}

const ui = new UIController({
  onSelectObject: (id) => selectObject(id),
  onPlayPause: (playing) => {
    solarSystem.playing = playing;
  },
  onSpeedChange: (speed) => {
    solarSystem.simSpeed = speed;
  },
  onResetView: () => {
    cameraRig.resetView();
  },
  onViewAll: () => {
    cameraRig.viewAll(solarSystem.outermostOrbitRadius);
    ui.closePanel();
    ui.setActiveNavItem(null);
  },
});

function animate() {
  requestAnimationFrame(animate);
  solarSystem.update();
  cameraRig.update();
  renderer.render(scene, cameraRig.camera);
}

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    ui.hideLoadingScreen();
  });
});

animate();
