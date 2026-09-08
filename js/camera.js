import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class CameraRig {
  constructor(canvas) {
    this.canvas = canvas;

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      4000
    );

    this.defaultPosition = new THREE.Vector3(0, 90, 210);
    this.defaultTarget = new THREE.Vector3(0, 0, 0);
    this.camera.position.copy(this.defaultPosition);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 620;
    this.controls.zoomSpeed = 0.85;
    this.controls.rotateSpeed = 0.55;
    this.controls.panSpeed = 0.6;
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();

    this._animating = false;
    this._animStart = 0;
    this._animDuration = 900;
    this._fromPos = new THREE.Vector3();
    this._toPos = new THREE.Vector3();
    this._fromTarget = new THREE.Vector3();
    this._toTarget = new THREE.Vector3();

    this._onResize = this._onResize.bind(this);
    window.addEventListener("resize", this._onResize);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  focusOn(targetPosition, distance) {
    const offset = new THREE.Vector3(distance * 0.55, distance * 0.42, distance * 0.72);
    const newCamPos = new THREE.Vector3().addVectors(targetPosition, offset);
    this._startTransition(newCamPos, targetPosition);
  }

  resetView() {
    this._startTransition(this.defaultPosition, this.defaultTarget);
  }

  viewAll(radius) {
    const dist = Math.max(radius * 1.35, 140);
    const pos = new THREE.Vector3(0, dist * 0.55, dist);
    this._startTransition(pos, new THREE.Vector3(0, 0, 0));
  }

  _startTransition(toPos, toTarget) {
    this._fromPos.copy(this.camera.position);
    this._toPos.copy(toPos);
    this._fromTarget.copy(this.controls.target);
    this._toTarget.copy(toTarget);
    this._animStart = performance.now();
    this._animating = true;
    this.controls.enabled = false;
  }

  update() {
    if (this._animating) {
      const t = Math.min(1, (performance.now() - this._animStart) / this._animDuration);
      const eased = easeInOutCubic(t);
      this.camera.position.lerpVectors(this._fromPos, this._toPos, eased);
      this.controls.target.lerpVectors(this._fromTarget, this._toTarget, eased);
      if (t >= 1) {
        this._animating = false;
        this.controls.enabled = true;
      }
    }
    this.controls.update();
  }

  dispose() {
    window.removeEventListener("resize", this._onResize);
    this.controls.dispose();
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
