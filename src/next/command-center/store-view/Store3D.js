/*
 * Store3D.js: the store view, a 3D plan of the restaurant drawn with three.js from
 * src/store-schema/restaurant.glb (embedded in store-model.js, see scripts/embed-store-model.mjs).
 * It follows the model's own viewer, src/store-schema/source/viewer.html: its lighting (room
 * light, soft shadows, ambient occlusion), its camera moves, the walls rising as it opens, its
 * markers, glows and floor rings, and its Overview, Plan, Tour and All labels buttons. The
 * statuses are the store's real checks (use-store-status.js) instead of the viewer's example data.
 *
 *   - Drag to turn, right-drag to move; zoom with the buttons, a pinch, or Ctrl/⌘ and the scroll
 *     wheel (plain scrolling still scrolls the page). Escape goes back to the overview.
 *   - Each area with a place in the model has a marker. A degraded or impacted station glows in
 *     that colour, and an impacted one pulses with a ring on the floor; its label stays on.
 *   - Clicking a marker or a station flies to it and shows its alerts in the panel at the bottom
 *     right. The chosen area is shared with the drive-thru panel beside the view.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { WORDING } from '../store-layout/config';
import AreaDetails, { STATUS_COLORS, StatusPill } from './AreaDetails';
import storeModel from './store-model';

// The model's station ids (userData.stationId) for the store areas whose ids differ.
const STATION_FOR_AREA = { 'front-counter': 'pos', 'mobile-pickup': 'mobile', 'dt-payment': 'dt5', 'dt-present': 'dt6' };
const stationFor = (areaId) => STATION_FOR_AREA[areaId] || areaId;
// The drive-thru windows have markers but no station group; their terminals stand in for them.
const WINDOW_MESHES = { POS_DT_Payment: 'dt5', POS_DT_Present: 'dt6' };

// The viewer's glow colours, chosen for the model's materials.
const GLOW = { degraded: new THREE.Color(0xd0921a), outage: new THREE.Color(0xd4453f), selected: new THREE.Color(0xb8892e) };
const RANK = { outage: 3, degraded: 2, unknown: 1, unmonitored: 1, healthy: 0 };
const TOUR_STOP_MS = 5200;
const WALL_TOP = 2; // metres: the walls are cut at 1.8 m
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// The viewer's two views, with a farther camera when the view is taller than it is wide. The view
// keeps their directions but finds its own distance, so the whole store fits this panel (see fit).
const VIEWS = {
  iso: (portrait) => ({ position: portrait ? [-24, 38, 33] : [-17.5, 23.5, 23.5], target: [0.4, 0, 1.3] }),
  top: (portrait) => ({ position: portrait ? [0, 62, 0.01] : [0, 40, 0.01], target: [0, 0, 0] }),
};
// Walls rise first, then each room's contents, back to front (seconds after it opens).
const INTRO_ORDER = [['Walls', 0], ['Partitions', 0.15], ['Windows', 0.35], ['Doors', 0.45], ['Kitchen', 0.6], ['Facilities', 0.75], ['ServiceArea', 0.85], ['DiningArea', 1.0]];

// The model, read once and shared by every view (the store view and its enlarged copy).
let modelPromise = null;
function loadModel() {
  if (!modelPromise) {
    modelPromise = new Promise((resolve, reject) => {
      const binary = atob(storeModel);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      // As in the viewer: textures are decoded with <img>, because createImageBitmap's loader
      // fetch()es blob: URLs, which a page's security policy may block (Grafana's may too).
      // The loader picks its texture loader as parsing starts, so hiding it for the call is enough.
      const createImageBitmap = window.createImageBitmap;
      window.createImageBitmap = undefined;
      try {
        new GLTFLoader().parse(bytes.buffer, '', resolve, reject);
      } finally {
        window.createImageBitmap = createImageBitmap;
      }
    });
    modelPromise.catch(() => { modelPromise = null; }); // let the next view try again
  }
  return modelPromise;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/*
 * Sets up three.js in `container` and gives back the view's controls:
 *   setLook(statusByStation, selectedStation)   glows, pulses and floor rings
 *   goView('iso' | 'top'), focus(station), zoom(factor), dispose()
 * `markers` is { areaId: element }, placed over their anchors on every frame. `onPick(station)` is
 * called with the station clicked in the model; `onUser()` when the camera is moved by hand.
 */
// Behind the store: the app's panel colour in each theme (styles.scss), a light grey rather than
// white in the light one, so the store's pale walls stand out.
const BACKGROUND = { dark: 0x14181d, light: 0xeef0f3 };

function createView(container, markers, { onPick, onUser, onReady, onFail }) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // The store doesn't move, so its shadows are drawn once (and while the walls rise), not every frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.domElement.className = 'cc-sv-canvas';
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND.dark); // the app's panel colour; setBackground switches it
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 250);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minDistance = 5;
  controls.maxDistance = 80;
  controls.screenSpacePanning = true;
  controls.enableZoom = false; // the page keeps the scroll wheel; see the wheel handler below
  // A frame is only drawn when something changed (the camera, a status, the size) or is moving
  // (a flight, the walls rising, a pulsing outage): the view is heavy for a page that also holds a map.
  let dirty = true;
  const invalidate = () => { dirty = true; };
  controls.addEventListener('change', invalidate);

  // Soft key light from the storefront side, cool fill from above.
  const sun = new THREE.DirectionalLight(0xfff3e4, 2.0);
  sun.position.set(-14, 24, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 13, bottom: -13, near: 1, far: 70 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 6;
  sun.shadow.blurSamples = 16;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xf4f6fa, 0x7d8087, 0.75));

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.0, scale: 1.2, samples: 12 });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  gtao.blendIntensity = 0.9;
  composer.addPass(gtao);
  composer.addPass(new OutputPass());

  const size = () => ({ width: container.clientWidth || 1, height: container.clientHeight || 1 });
  const portrait = () => camera.aspect < 1;
  const resize = () => {
    const { width, height } = size();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    camera.aspect = width / height;
    camera.fov = width < 600 ? 42 : 28;
    camera.updateProjectionMatrix();
    invalidate();
  };
  // Resized on the next frame, so a resize never lands inside the observer's own notification.
  let resizeFrame = 0;
  const resizer = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });
  resizer.observe(container);
  resize();
  // Nothing is drawn while the view is scrolled out of sight.
  let onScreen = true;
  const watcher = typeof IntersectionObserver === 'function' ? new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) invalidate();
  }) : null;
  if (watcher) watcher.observe(container);

  // ---- camera moves: a crane-like arc from where the camera is to a new view
  let flight = null;
  const flyTo = (position, target, ms = 1400) => {
    flight = {
      from: { position: camera.position.clone(), target: controls.target.clone() },
      to: { position: new THREE.Vector3(...position), target: new THREE.Vector3(...target) },
      start: performance.now(),
      ms: reduceMotion() ? 1 : ms,
    };
  };
  const stepFlight = (now) => {
    if (!flight) return;
    const k = Math.min(1, (now - flight.start) / flight.ms);
    const e = ease(k);
    const lift = Math.sin(Math.PI * e) * flight.from.position.distanceTo(flight.to.position) * 0.12;
    camera.position.lerpVectors(flight.from.position, flight.to.position, e).y += lift;
    controls.target.lerpVectors(flight.from.target, flight.to.target, e);
    if (k >= 1) flight = null;
    invalidate();
  };
  // Where to stand to see the whole store from a view's direction, in the free part of the panel
  // (under the toolbar and counts, above the legend): the nearest distance at which every corner of
  // the model's box is inside it, then the point looked at moved to its middle, a few times over.
  const FREE = { left: -0.94, right: 0.94, bottom: -0.88, top: 0.8 };
  const corners = [];
  const fit = (name) => {
    const view = VIEWS[name](portrait());
    const direction = new THREE.Vector3(...view.position).sub(new THREE.Vector3(...view.target)).normalize();
    const probe = camera.clone();
    const target = new THREE.Vector3(...view.target);
    const point = new THREE.Vector3();
    const place = (distance) => {
      probe.position.copy(target).addScaledVector(direction, distance);
      probe.lookAt(target);
      probe.updateMatrixWorld();
    };
    const drawn = () => {
      const box = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
      corners.forEach((corner) => {
        point.copy(corner).project(probe);
        box.left = Math.min(box.left, point.x);
        box.right = Math.max(box.right, point.x);
        box.bottom = Math.min(box.bottom, point.y);
        box.top = Math.max(box.top, point.y);
      });
      return box;
    };
    let distance = controls.maxDistance;
    for (let round = 0; round < 4; round += 1) {
      let near = controls.minDistance;
      let far = controls.maxDistance;
      for (let i = 0; i < 24; i += 1) {
        const middle = (near + far) / 2;
        place(middle);
        const box = drawn();
        if (box.left >= FREE.left && box.right <= FREE.right && box.bottom >= FREE.bottom && box.top <= FREE.top) far = middle;
        else near = middle;
      }
      distance = far;
      place(distance);
      const box = drawn();
      const shift = new THREE.Vector3(
        (box.left + box.right) / 2 - (FREE.left + FREE.right) / 2,
        (box.bottom + box.top) / 2 - (FREE.bottom + FREE.top) / 2,
        target.clone().project(probe).z,
      );
      target.copy(shift.unproject(probe));
    }
    place(distance);
    return { position: probe.position.toArray(), target: target.toArray() };
  };
  const goView = (name, ms = 1500) => {
    if (!corners.length) return;
    const view = fit(name);
    flyTo(view.position, view.target, ms);
  };
  const zoom = (factor) => {
    flight = null;
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset);
    invalidate();
  };

  // ---- the model
  const groups = {}; // station -> [Object3D]
  const anchors = {}; // station -> Marker_ object
  const rings = {}; // station -> { mesh, box }
  const intro = []; // { object, delay }
  const glowing = {}; // station -> { meshes, base, pulse }
  let introStart = 0;
  let ready = false;
  let disposed = false;
  let frame = 0;

  const meshesOf = (station) => {
    const out = [];
    (groups[station] || []).forEach((group) => group.traverse((node) => { if (node.isMesh) out.push(node); }));
    return out;
  };
  // An outage ring: a soft circle on the floor under the station that breathes slowly.
  const makeRing = (station) => {
    const box = new THREE.Box3();
    (groups[station] || []).forEach((group) => box.expandByObject(group));
    if (box.isEmpty()) return null;
    const center = box.getCenter(new THREE.Vector3());
    const extent = box.getSize(new THREE.Vector3());
    const radius = Math.min(Math.max(extent.x, extent.z) * 0.5 + 0.3, 2.2);
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.95, radius, 72),
      new THREE.MeshBasicMaterial({ color: GLOW.outage, transparent: true, opacity: 0, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(center.x, 0.02, center.z);
    mesh.renderOrder = 2;
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, box };
  };

  // Status and selection are shown with copies of the materials; the model is never changed.
  const setGlow = (station, color, base, pulse) => {
    const meshes = meshesOf(station);
    if (!color) {
      meshes.forEach((mesh) => {
        if (mesh.userData.baseMat && mesh.material !== mesh.userData.baseMat) {
          mesh.material.dispose();
          mesh.material = mesh.userData.baseMat;
        }
      });
      delete glowing[station];
      return;
    }
    meshes.forEach((mesh) => {
      if (!mesh.userData.baseMat) mesh.userData.baseMat = mesh.material;
      if (mesh.material === mesh.userData.baseMat) mesh.material = mesh.userData.baseMat.clone();
      if (!mesh.material.emissive) return;
      mesh.material.emissive = color.clone();
      mesh.material.emissiveIntensity = base;
    });
    glowing[station] = { meshes, base, pulse };
  };
  let look = { statusByStation: {}, selectedStation: null };
  const applyLook = () => {
    if (!ready) return;
    Object.keys(groups).forEach((station) => {
      const status = look.statusByStation[station];
      if (status === 'outage') setGlow(station, GLOW.outage, 0.26, true);
      else if (status === 'degraded') setGlow(station, GLOW.degraded, 0.22, false);
      else if (station === look.selectedStation) setGlow(station, GLOW.selected, 0.12, false);
      else setGlow(station, null);
      if (rings[station]) rings[station].mesh.visible = status === 'outage';
    });
    invalidate();
  };
  const stepGlow = (now) => {
    const t = now / 1000;
    if (Object.values(glowing).some((glow) => glow.pulse) || Object.values(rings).some((ring) => ring && ring.mesh.visible)) invalidate();
    Object.values(glowing).forEach((glow) => {
      if (!glow.pulse) return;
      const k = reduceMotion() ? 1 : 0.55 + 0.45 * Math.sin(t * 2.4);
      glow.meshes.forEach((mesh) => { if (mesh.material.emissive) mesh.material.emissiveIntensity = glow.base * (0.6 + 0.8 * k); });
    });
    Object.values(rings).forEach((ring) => {
      if (!ring || !ring.mesh.visible) return;
      const p = reduceMotion() ? 0.5 : (t * 0.6) % 1;
      ring.mesh.scale.setScalar(0.85 + p * 0.45);
      ring.mesh.material.opacity = 0.45 * (1 - p);
    });
  };
  const stepIntro = (now) => {
    if (!intro.length) return;
    const t = (now - introStart) / 1000;
    let done = true;
    intro.forEach((item) => {
      const k = Math.min(1, Math.max(0, (t - item.delay) / 0.6));
      if (k < 1) done = false;
      item.object.scale.y = Math.max(0.001, 1 - Math.pow(1 - k, 3));
    });
    if (done) intro.length = 0;
    renderer.shadowMap.needsUpdate = true;
    invalidate();
  };

  // Flies to a station, looking at it from inside the building (so outer walls never block it),
  // blended with the overview direction so every move feels like the same camera.
  const focus = (station) => {
    const ring = rings[station];
    if (!ring) return;
    const center = ring.box.getCenter(new THREE.Vector3());
    const extent = ring.box.getSize(new THREE.Vector3()).length();
    const distance = Math.max(9, extent * 2.6) * (portrait() ? 1.5 : 1);
    const inward = new THREE.Vector3(-center.x, 0, -center.z);
    if (inward.lengthSq() < 0.01) inward.set(0, 0, 1);
    const direction = inward.normalize().multiplyScalar(0.65).add(new THREE.Vector3(-0.6, 0, 0.8).multiplyScalar(0.35));
    direction.normalize().multiplyScalar(distance * 0.6);
    flyTo([center.x + direction.x, center.y + distance * 0.85, center.z + direction.z], [center.x, center.y * 0.5, center.z], 1300);
  };

  // ---- pointer: a click that didn't drag picks the station under it; moving by hand stops flights
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let down = null;
  const onDown = (event) => {
    down = { x: event.clientX, y: event.clientY };
    flight = null;
    onUser();
  };
  const onUp = (event) => {
    if (!down || !ready || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4) return;
    const box = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const all = [];
    Object.keys(groups).forEach((station) => meshesOf(station).forEach((mesh) => all.push([mesh, station])));
    const hit = raycaster.intersectObjects(all.map(([mesh]) => mesh), false)[0];
    if (hit) onPick(all.find(([mesh]) => mesh === hit.object)[1]);
  };
  // Ctrl/⌘ + wheel, and a trackpad pinch (which the browser sends as Ctrl + wheel), zoom.
  const onWheel = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    onUser();
    zoom(Math.exp(event.deltaY * 0.004));
  };
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

  const position = new THREE.Vector3();
  const placeMarkers = () => {
    const { width, height } = size();
    const hidden = intro.length > 0;
    Object.keys(markers).forEach((areaId) => {
      const element = markers[areaId];
      const anchor = anchors[stationFor(areaId)];
      if (!element || !anchor) return;
      anchor.getWorldPosition(position).project(camera);
      const shown = !hidden && position.z < 1 && Math.abs(position.x) < 1.1 && Math.abs(position.y) < 1.1;
      element.style.visibility = shown ? '' : 'hidden';
      element.style.opacity = shown ? '' : '0';
      if (shown) element.style.transform = `translate(${((position.x + 1) / 2) * width}px, ${((1 - position.y) / 2) * height}px) translate(-12px, -100%)`;
    });
  };
  const tick = (now) => {
    if (disposed) return;
    frame = requestAnimationFrame(tick);
    if (!onScreen) return;
    stepFlight(now);
    if (ready) {
      stepIntro(now);
      stepGlow(now);
    }
    controls.update(); // with damping, a camera still settling sends 'change'
    if (!dirty) return;
    dirty = false;
    composer.render();
    if (ready) placeMarkers();
  };
  frame = requestAnimationFrame(tick);

  loadModel().then((gltf) => {
    if (disposed) return;
    const root = gltf.scene.clone(true);
    root.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        if (node.material.transparent) {
          node.castShadow = false;
          node.material.depthWrite = false;
        }
      }
      const station = node.userData && node.userData.stationId;
      if (station) {
        if (node.name.startsWith('Marker_')) anchors[station] = node;
        else (groups[station] = groups[station] || []).push(node);
      }
      if (WINDOW_MESHES[node.name]) (groups[WINDOW_MESHES[node.name]] = groups[WINDOW_MESHES[node.name]] || []).push(node);
    });
    INTRO_ORDER.forEach(([name, delay]) => {
      const group = root.getObjectByName(name);
      if (!group) return;
      const items = [];
      group.traverse((node) => { if (node.isMesh && node.parent && !node.parent.isMesh) items.push(node); });
      items.sort((a, b) => a.getWorldPosition(new THREE.Vector3()).z - b.getWorldPosition(new THREE.Vector3()).z);
      items.forEach((object, i) => intro.push({ object, delay: delay + (i / Math.max(1, items.length)) * 0.5 }));
    });
    scene.add(root);
    // The store's box, up to the height the walls are cut at (a menu board stands higher; it may
    // reach under the toolbar rather than shrink the whole store).
    const bounds = new THREE.Box3().setFromObject(root);
    const top = Math.min(bounds.max.y, WALL_TOP);
    [bounds.min.x, bounds.max.x].forEach((x) => [bounds.min.y, top].forEach((y) => [bounds.min.z, bounds.max.z].forEach((z) => corners.push(new THREE.Vector3(x, y, z)))));
    Object.keys(groups).forEach((station) => { rings[station] = makeRing(station); });
    intro.forEach((item) => { item.object.scale.y = reduceMotion() ? 1 : 0.001; });
    ready = true;
    renderer.shadowMap.needsUpdate = true;
    applyLook();
    introStart = performance.now();
    // Start high above the plan and crane down into the overview.
    camera.position.set(-4, 70, 30);
    controls.target.set(0, 0, 0);
    goView('iso', 2600);
    onReady();
  }, onFail);

  return {
    setBackground(color) {
      scene.background.setHex(color);
      invalidate();
    },
    setLook(statusByStation, selectedStation) {
      look = { statusByStation, selectedStation };
      applyLook();
    },
    goView,
    focus,
    zoom,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      resizer.disconnect();
      if (watcher) watcher.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      Object.keys(glowing).forEach((station) => setGlow(station, null)); // the model's own materials are shared, never disposed
      Object.values(rings).forEach((ring) => {
        if (!ring) return;
        ring.mesh.geometry.dispose();
        ring.mesh.material.dispose();
      });
      controls.removeEventListener('change', invalidate);
      controls.dispose();
      gtao.dispose();
      composer.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// The strip in the top-left corner: how many areas are impacted, degraded and healthy.
function Summary({ summary }) {
  const { counts, loading, failed, updatedAt, problems } = summary;
  return (
    <div className="cc-sv-summary">
      {failed && <span className="cc-sv-chip cc-sv-text-outage">{WORDING.loadFailed}</span>}
      {!failed && loading && <span className="cc-sv-chip">{WORDING.loading}</span>}
      {!failed && !loading && (
        <>
          <span className="cc-sv-chip"><i style={{ background: STATUS_COLORS.outage }} />{counts.outage} {WORDING.summaryOutage}</span>
          {counts.degraded > 0 && <span className="cc-sv-chip"><i style={{ background: STATUS_COLORS.degraded }} />{counts.degraded} {WORDING.summaryDegraded}</span>}
          <span className="cc-sv-chip"><i style={{ background: STATUS_COLORS.healthy }} />{counts.healthy} {WORDING.summaryHealthy}</span>
        </>
      )}
      {updatedAt && <span className="cc-sv-chip cc-sv-faint">Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
      {problems.map((problem) => <span key={problem} className="cc-sv-chip cc-sv-text-outage">{problem}</span>)}
    </div>
  );
}

/**
 *   results     the store's areas with their status (use-store-status.js)
 *   summary     its counts, loading, failed, updatedAt, problems
 *   selectedId  the chosen area, or null; onSelect(areaId or null) changes it
 */
export default function Store3D({ results, summary, selectedId, onSelect }) {
  const mode = useTheme().palette.mode;
  const box = useRef(null);
  const view = useRef(null);
  const markers = useRef({});
  const [state, setState] = useState({ status: 'loading', error: '' });
  const [viewName, setViewName] = useState('iso');
  const [allLabels, setAllLabels] = useState(true);
  const [touring, setTouring] = useState(false);
  const pick = useRef(null);
  const stopTour = useRef(null);

  // The areas the model has a place for, and which station each one is.
  const placed = results.filter(({ area }) => area.group !== 'Drive-thru' || STATION_FOR_AREA[area.id]);
  const areaForStation = {};
  placed.forEach(({ area }) => {
    const station = stationFor(area.id);
    if (!areaForStation[station]) areaForStation[station] = area.id;
  });
  pick.current = (station) => {
    const areaId = areaForStation[station];
    if (areaId) onSelect(areaId === selectedId ? null : areaId);
  };
  stopTour.current = () => setTouring(false);

  useEffect(() => {
    let current = null;
    try {
      current = createView(box.current, markers.current, {
        onPick: (station) => { stopTour.current(); pick.current(station); },
        onUser: () => stopTour.current(),
        onReady: () => setState({ status: 'ready', error: '' }),
        onFail: (error) => setState({ status: 'failed', error: (error && error.message) || String(error) }),
      });
    } catch (error) {
      setState({ status: 'failed', error: (error && error.message) || String(error) });
    }
    view.current = current;
    return () => {
      if (current) current.dispose();
      view.current = null;
    };
  }, []);

  // The scene behind the store in the app's theme (app/theme.js).
  useEffect(() => {
    if (view.current) view.current.setBackground(mode === 'light' ? BACKGROUND.light : BACKGROUND.dark);
  }, [mode, state.status]);

  const statusByStation = {};
  placed.forEach(({ area, status }) => {
    const station = stationFor(area.id);
    // Two areas on one station (none today): the worse status shows.
    if (!statusByStation[station] || RANK[status] > RANK[statusByStation[station]]) statusByStation[station] = status;
  });
  const selected = placed.find(({ area }) => area.id === selectedId);
  const selectedStation = selected ? stationFor(selected.area.id) : null;
  const look = JSON.stringify([statusByStation, selectedStation]);
  useEffect(() => {
    if (view.current) view.current.setLook(statusByStation, selectedStation);
  }, [look, state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Choosing an area (here or in the drive-thru panel) flies to it; letting go of it flies back.
  const wasSelected = useRef(null);
  useEffect(() => {
    if (state.status !== 'ready' || !view.current) return;
    if (selectedStation) view.current.focus(selectedStation);
    else if (wasSelected.current) {
      view.current.goView('iso');
      setViewName('iso');
    }
    wasSelected.current = selectedStation;
  }, [selectedStation, state.status]);

  // The tour visits the areas with problems first, then the rest, pausing on each.
  const tourList = placed.slice().sort((a, b) => RANK[b.status] - RANK[a.status]).map(({ area }) => area.id);
  const tourListRef = useRef(tourList);
  tourListRef.current = tourList;
  useEffect(() => {
    if (!touring) return undefined;
    let i = 0;
    const next = () => {
      const list = tourListRef.current;
      if (list.length) onSelect(list[i % list.length]);
      i += 1;
    };
    next();
    const timer = setInterval(next, TOUR_STOP_MS);
    return () => clearInterval(timer);
  }, [touring]); // eslint-disable-line react-hooks/exhaustive-deps

  const showView = (name) => {
    setTouring(false);
    setViewName(name);
    if (name === 'iso' && selectedId) onSelect(null);
    if (view.current) view.current.goView(name);
  };

  return (
    <div
      className="cc-sv"
      ref={box}
      onKeyDown={(event) => { if (event.key === 'Escape' && selectedId) { setTouring(false); onSelect(null); } }}
    >
      {placed.map(({ area, status }) => {
        const on = selectedId === area.id;
        const label = allLabels || on || status === 'outage' || status === 'degraded';
        return (
          <button
            key={area.id}
            type="button"
            ref={(element) => { if (element) markers.current[area.id] = element; else delete markers.current[area.id]; }}
            className={`cc-sv-marker${label ? ' cc-sv-marker-label' : ''}${on ? ' cc-sv-marker-on' : ''}${status === 'outage' ? ' cc-sv-marker-pulse' : ''}`}
            style={{ visibility: 'hidden', opacity: 0 }}
            onClick={() => { setTouring(false); onSelect(on ? null : area.id); }}
            aria-label={`${area.name}: ${WORDING[status]}`}
            aria-pressed={on}
          >
            <i style={{ background: STATUS_COLORS[status] }} />
            <span>{area.short}</span>
          </button>
        );
      })}

      {state.status === 'loading' && <p className="cc-sv-message">Loading the 3D store…</p>}
      {state.status === 'failed' && <p className="cc-sv-message cc-bad">Couldn't show the 3D store. {state.error}</p>}

      <Summary summary={summary} />

      <div className="cc-sv-tools" role="toolbar" aria-label="View controls">
        <button type="button" className="cc-sv-tool" aria-pressed={viewName === 'iso' && !selected} onClick={() => showView('iso')}>Overview</button>
        <button type="button" className="cc-sv-tool" aria-pressed={viewName === 'top' && !selected} onClick={() => showView('top')}>Plan</button>
        <button type="button" className="cc-sv-tool" aria-pressed={touring} onClick={() => setTouring(!touring)}>Tour</button>
        <button type="button" className="cc-sv-tool" aria-pressed={allLabels} onClick={() => setAllLabels(!allLabels)}>All labels</button>
        <span className="cc-sv-tools-gap" aria-hidden="true" />
        <button type="button" className="cc-sv-tool" title="Zoom in" aria-label="Zoom in" onClick={() => { setTouring(false); if (view.current) view.current.zoom(0.8); }}>+</button>
        <button type="button" className="cc-sv-tool" title="Zoom out" aria-label="Zoom out" onClick={() => { setTouring(false); if (view.current) view.current.zoom(1.25); }}>−</button>
      </div>

      <div className="cc-sv-legend" aria-label="Status legend">
        {['healthy', 'degraded', 'outage', 'unmonitored', 'unknown'].map((status) => (
          <span key={status}><i style={{ background: STATUS_COLORS[status] }} />{WORDING[status]}</span>
        ))}
      </div>

      {!selected && state.status === 'ready' && (
        <p className="cc-sv-hint">Click a marker or a piece of equipment to fly to it · drag to turn · pinch or Ctrl+scroll to zoom</p>
      )}
      <aside className="cc-sv-card" aria-live="polite" hidden={!selected}>
        {selected && (
          <>
            <div className="cc-sv-card-head">
              <div>
                <span className="cc-sv-group">{selected.area.group}</span>
                <h3>{selected.area.name}</h3>
              </div>
              <button type="button" className="cc-sv-close" onClick={() => { setTouring(false); onSelect(null); }} aria-label="Close">×</button>
            </div>
            <StatusPill status={selected.status} />
            <AreaDetails result={selected} />
          </>
        )}
      </aside>
    </div>
  );
}
