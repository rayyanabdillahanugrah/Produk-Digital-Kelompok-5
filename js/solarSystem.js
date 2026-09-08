import * as THREE from "three";
import { CELESTIAL_DATA, PLANET_ORDER } from "./planets.js";

const EARTH_DIAMETER_KM = CELESTIAL_DATA.earth.diameterKm;
const AU_KM = 149600000;

// Unit dasar untuk skala visual (dikompresi, BUKAN skala literal)
const EARTH_VISUAL_RADIUS = 2.2;
const ORBIT_SCALE = 34; // dikalikan sqrt(jarak dalam AU)
const MIN_PLANET_RADIUS = 1.15;

function visualRadiusFor(diameterKm) {
  const ratio = diameterKm / EARTH_DIAMETER_KM;
  const r = EARTH_VISUAL_RADIUS * Math.cbrt(ratio);
  return Math.max(r, MIN_PLANET_RADIUS);
}

function visualOrbitRadiusFor(distanceKm) {
  const au = distanceKm / AU_KM;
  return Math.sqrt(au) * ORBIT_SCALE;
}

export class SolarSystem {
  constructor(scene, quality = "high") {
    this.scene = scene;
    this.quality = quality;
    this.planetMeshes = new Map();
    this.selectable = [];
    this.clock = new THREE.Clock();
    this.simSpeed = 1;
    this.playing = true;

    this._buildLighting();
    this._buildStarfield();
    this._buildSun();
    this._buildPlanets();
    this._buildAsteroidBelt();
  }

  get sunVisualRadius() {
    return this._sunRadius;
  }

  get outermostOrbitRadius() {
    return visualOrbitRadiusFor(CELESTIAL_DATA.neptune.distanceFromSunKm);
  }

  _buildLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const sunLight = new THREE.PointLight(0xfff3da, 2.4, 0, 0);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    // Cahaya pengisi lembut agar sisi gelap planet tidak hitam total
    const fill = new THREE.HemisphereLight(0xf7f6f2, 0xd9dde1, 0.35);
    this.scene.add(fill);
  }

  _buildStarfield() {
    const count = this.quality === "low" ? 700 : 1600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const radius = 900;

    for (let i = 0; i < count; i++) {
      const r = radius * (0.6 + Math.random() * 0.4);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xaeb6be,
      size: 1.15,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  _buildSun() {
    const data = CELESTIAL_DATA.sun;
    this._sunRadius = EARTH_VISUAL_RADIUS * Math.cbrt(data.diameterKm / EARTH_DIAMETER_KM) * 0.62;

    const segments = this.quality === "low" ? 28 : 48;
    const geometry = new THREE.SphereGeometry(this._sunRadius, segments, segments);
    const material = new THREE.MeshStandardMaterial({
      color: data.color,
      emissive: new THREE.Color(data.color),
      emissiveIntensity: 0.55,
      roughness: 0.55,
      metalness: 0,
    });

    this.sunMesh = new THREE.Mesh(geometry, material);
    this.sunMesh.userData = { id: "sun", isSelectable: true };
    this.scene.add(this.sunMesh);
    this.selectable.push(this.sunMesh);

    const haloGeometry = new THREE.SphereGeometry(this._sunRadius * 1.18, segments, segments);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xf4b942,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(haloGeometry, haloMaterial));
  }

  _buildPlanets() {
    const segments = this.quality === "low" ? 20 : 36;

    PLANET_ORDER.forEach((id) => {
      const data = CELESTIAL_DATA[id];
      const visualRadius = visualRadiusFor(data.diameterKm);
      const orbitRadius = visualOrbitRadiusFor(data.distanceFromSunKm);

      const orbitGroup = new THREE.Group();
      const planetGroup = new THREE.Group();
      planetGroup.position.set(orbitRadius, 0, 0);
      orbitGroup.add(planetGroup);
      this.scene.add(orbitGroup);

      const geometry = new THREE.SphereGeometry(visualRadius, segments, segments);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.85,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { id, isSelectable: true };
      mesh.rotation.z = THREE.MathUtils.degToRad(id === "uranus" ? 82 : 8 + Math.random() * 6);
      planetGroup.add(mesh);
      this.selectable.push(mesh);

      if (data.hasRings) {
        const ringInner = visualRadius * 1.35;
        const ringOuter = visualRadius * (id === "saturn" ? 2.15 : 1.65);
        const ringGeometry = new THREE.RingGeometry(ringInner, ringOuter, 64);
        const pos = ringGeometry.attributes.position;
        const v3 = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v3.fromBufferAttribute(pos, i);
          ringGeometry.attributes.uv.setXY(i, v3.length() < (ringInner + ringOuter) / 2 ? 0 : 1, 1);
        }
        const ringMaterial = new THREE.MeshStandardMaterial({
          color: id === "saturn" ? 0xd9c48a : 0x9fd8d0,
          roughness: 0.9,
          metalness: 0,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.72,
        });
        const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        ringMesh.rotation.x = Math.PI / 2 + THREE.MathUtils.degToRad(id === "uranus" ? 8 : -18);
        planetGroup.add(ringMesh);
      }

      const orbitLineGeometry = new THREE.BufferGeometry().setFromPoints(
        new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius, 0, Math.PI * 2, false, 0).getPoints(128)
      );
      const orbitLineMaterial = new THREE.LineBasicMaterial({
        color: 0xaeb6be,
        transparent: true,
        opacity: 0.55,
      });
      const orbitLine = new THREE.LineLoop(orbitLineGeometry, orbitLineMaterial);
      orbitLine.rotation.x = Math.PI / 2;
      this.scene.add(orbitLine);

      const angularSpeed = (Math.PI * 2) / data.orbitalPeriodDays; // radian per "hari simulasi"
      const initialAngle = Math.random() * Math.PI * 2;
      orbitGroup.rotation.y = initialAngle;

      const selfRotationSpeed =
        data.rotationHours !== 0 ? (Math.PI * 2) / (data.rotationHours / 24) : 0;

      this.planetMeshes.set(id, {
        orbitGroup,
        planetGroup,
        mesh,
        data,
        visualRadius,
        orbitRadius,
        angularSpeed,
        selfRotationSpeed,
      });
    });
  }

  _buildAsteroidBelt() {
    const marsOrbit = visualOrbitRadiusFor(CELESTIAL_DATA.mars.distanceFromSunKm);
    const jupiterOrbit = visualOrbitRadiusFor(CELESTIAL_DATA.jupiter.distanceFromSunKm);
    const innerR = marsOrbit + (jupiterOrbit - marsOrbit) * 0.22;
    const outerR = marsOrbit + (jupiterOrbit - marsOrbit) * 0.62;

    const count = this.quality === "low" ? 420 : 900;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const r = innerR + Math.random() * (outerR - innerR);
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 2.2;
      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * r;
    }
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x9ca3aa,
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });

    this.asteroidBelt = new THREE.Points(geometry, material);
    this.scene.add(this.asteroidBelt);
  }

  update() {
    const delta = this.clock.getDelta();
    if (!this.playing) return;

    const simDays = delta * 4 * this.simSpeed;

    this.planetMeshes.forEach(({ orbitGroup, mesh, angularSpeed, selfRotationSpeed }) => {
      orbitGroup.rotation.y += angularSpeed * simDays;
      mesh.rotation.y += selfRotationSpeed * simDays * 0.05;
    });

    this.sunMesh.rotation.y += delta * 0.02 * this.simSpeed;

    if (this.asteroidBelt) {
      this.asteroidBelt.rotation.y += delta * 0.01 * this.simSpeed;
    }
  }

  getWorldPosition(id) {
    const entry = id === "sun" ? null : this.planetMeshes.get(id);
    if (id === "sun") {
      return new THREE.Vector3(0, 0, 0);
    }
    if (!entry) return new THREE.Vector3(0, 0, 0);
    const pos = new THREE.Vector3();
    entry.mesh.getWorldPosition(pos);
    return pos;
  }

  getVisualRadius(id) {
    if (id === "sun") return this._sunRadius;
    const entry = this.planetMeshes.get(id);
    return entry ? entry.visualRadius : 2;
  }

  dispose() {
    this.selectable.forEach((mesh) => {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
  }
}
