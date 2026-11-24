import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Artifact, Hotspot, LightingPreset } from '../types/museum';

export type CameraStageMode = 'title' | 'hall' | 'inspect' | 'timeline' | 'codex';

interface SanctuaryCanvasProps {
  artifact: Artifact;
  stageMode: CameraStageMode;
  lighting: LightingPreset;
  flashlightOn: boolean;
  scaleRefOn: boolean;
  showHotspots: boolean;
  autoRotate: boolean;
  loreDrawerOpen: boolean;
  activeHotspotId: string | null;
  resetSignal: number;
  pulseSignal: number;
  onSelectHotspot: (h: Hotspot | null) => void;
}

interface ProjectedPin {
  hotspot: Hotspot;
  x: number;
  y: number;
  visible: boolean;
  occluded: boolean;
  index: number;
}

const TARGET_MAX_DIM = 2.18;

/** Procedural dark obsidian hall floor texture with ancient Chinese bronze-gold inlaid compass rings */
function createSanctuaryFloorTexture(): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  // Deep radial obsidian stone base
  const bg = ctx.createRadialGradient(cx, cy, 40, cx, cy, 512);
  bg.addColorStop(0, '#181510');
  bg.addColorStop(0.35, '#0d0e13');
  bg.addColorStop(0.75, '#07080b');
  bg.addColorStop(1, '#040507');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Subtle concentric gold inlaid stone rings (Chinese astronomical / ritual dial motif)
  const radii = [122, 134, 215, 224, 340, 355, 460];
  radii.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = idx % 2 === 0 ? 'rgba(209, 172, 106, 0.32)' : 'rgba(209, 172, 106, 0.12)';
    ctx.lineWidth = idx === 0 || idx === 2 ? 2.2 : 1.1;
    ctx.stroke();
  });

  // 24 radial cardinal tick spokes like an ancient Han sundial / compass
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const inner = i % 3 === 0 ? 134 : 215;
    const outer = i % 6 === 0 ? 460 : 340;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
    ctx.strokeStyle = i % 6 === 0 ? 'rgba(209, 172, 106, 0.22)' : 'rgba(209, 172, 106, 0.09)';
    ctx.lineWidth = i % 6 === 0 ? 1.5 : 0.9;
    ctx.stroke();
  }

  // Subtle fine stone grain speckles
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const alpha = Math.random() * 0.04;
    ctx.fillStyle = `rgba(220, 196, 145, ${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Soft volumetric god-ray cone texture descending from the sanctuary oculus */
function createLightBeamTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, 'rgba(235, 200, 132, 0.24)');
  grad.addColorStop(0.45, 'rgba(210, 170, 98, 0.09)');
  grad.addColorStop(1, 'rgba(201, 164, 101, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Real-world centimeter scale comparison silhouette & architectural brackets */
function buildScaleReferenceGroup(
  artifact: Artifact,
  normBox: THREE.Box3
): { group: THREE.Group; refLabel: string; refHeightCm: number } {
  const group = new THREE.Group();
  const normSize = new THREE.Vector3();
  normBox.getSize(normSize);

  const realH = Math.max(artifact.dimensions.height, 1);
  const realW = Math.max(artifact.dimensions.width, 1);
  const unitsPerCm = realH >= realW * 0.25 ? normSize.y / realH : normSize.x / realW;

  const goldLineMat = new THREE.LineBasicMaterial({
    color: 0xe6cb92,
    transparent: true,
    opacity: 0.85,
  });
  const dimLineMat = new THREE.LineBasicMaterial({
    color: 0xc9a465,
    transparent: true,
    opacity: 0.45,
  });

  const floorY = normBox.min.y;
  const xRight = normBox.max.x + 0.26;

  // Height bracket
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xRight - 0.08, floorY, 0),
        new THREE.Vector3(xRight, floorY, 0),
        new THREE.Vector3(xRight, normBox.max.y, 0),
        new THREE.Vector3(xRight - 0.08, normBox.max.y, 0),
      ]),
      goldLineMat
    )
  );

  // Width bracket
  const zFront = normBox.max.z + 0.22;
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(normBox.min.x, floorY + 0.01, zFront - 0.08),
        new THREE.Vector3(normBox.min.x, floorY + 0.01, zFront),
        new THREE.Vector3(normBox.max.x, floorY + 0.01, zFront),
        new THREE.Vector3(normBox.max.x, floorY + 0.01, zFront - 0.08),
      ]),
      dimLineMat
    )
  );

  let refHeightCm = 15;
  let refWidthCm = 7.4;
  let refLabel = '智能手机参照 (15 cm)';
  let shapeType: 'phone' | 'book' | 'person' = 'phone';

  if (realH > 65) {
    refHeightCm = 170;
    refWidthCm = 46;
    refLabel = '观展者身高参照 (170 cm)';
    shapeType = 'person';
  } else if (realH > 22) {
    refHeightCm = 29.7;
    refWidthCm = 21;
    refLabel = 'A4 典藏图录参照 (29.7 × 21 cm)';
    shapeType = 'book';
  }

  const refHWorld = Math.min(refHeightCm * unitsPerCm, 3.85);
  const refWWorld = refWidthCm * unitsPerCm;
  const refX = normBox.min.x - 0.36 - refWWorld * 0.5;

  const fillMat = new THREE.MeshBasicMaterial({
    color: 0xd7b472,
    transparent: true,
    opacity: 0.11,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  if (shapeType === 'person') {
    const s = refHWorld / 1.7;
    const person = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.105 * s, 28), fillMat);
    head.position.set(0, 1.59 * s, 0);
    person.add(head);

    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-0.115 * s, 0);
    bodyShape.lineTo(-0.135 * s, 0.84 * s);
    bodyShape.lineTo(-0.205 * s, 0.88 * s);
    bodyShape.lineTo(-0.215 * s, 1.38 * s);
    bodyShape.quadraticCurveTo(-0.175 * s, 1.47 * s, 0, 1.47 * s);
    bodyShape.quadraticCurveTo(0.175 * s, 1.47 * s, 0.215 * s, 1.38 * s);
    bodyShape.lineTo(0.205 * s, 0.88 * s);
    bodyShape.lineTo(0.135 * s, 0.84 * s);
    bodyShape.lineTo(0.115 * s, 0);
    bodyShape.lineTo(0.032 * s, 0);
    bodyShape.lineTo(0.022 * s, 0.72 * s);
    bodyShape.lineTo(-0.022 * s, 0.72 * s);
    bodyShape.lineTo(-0.032 * s, 0);
    bodyShape.closePath();

    const bodyGeo = new THREE.ShapeGeometry(bodyShape);
    person.add(new THREE.Mesh(bodyGeo, fillMat));
    const outlinePts = bodyShape.getPoints(36).map((p) => new THREE.Vector3(p.x, p.y, 0.004));
    person.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(outlinePts), goldLineMat));

    const headRing = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 1.59 * s, 0.105 * s, 0, Math.PI * 2, false).getPoints(32)
      ),
      goldLineMat
    );
    person.add(headRing);

    person.position.set(refX, floorY, 0);
    group.add(person);
  } else {
    const planeGeo = new THREE.PlaneGeometry(refWWorld, refHWorld);
    const mesh = new THREE.Mesh(planeGeo, fillMat);
    mesh.position.set(refX, floorY + refHWorld * 0.5, 0);
    group.add(mesh);

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(planeGeo), goldLineMat);
    edges.position.copy(mesh.position);
    group.add(edges);
  }

  return { group, refLabel, refHeightCm };
}

export const SanctuaryCanvas: React.FC<SanctuaryCanvasProps> = ({
  artifact,
  stageMode,
  lighting,
  flashlightOn,
  scaleRefOn,
  showHotspots,
  autoRotate,
  loreDrawerOpen,
  activeHotspotId,
  resetSignal,
  pulseSignal,
  onSelectHotspot,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadingPct, setLoadingPct] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pins, setPins] = useState<ProjectedPin[]>([]);
  const [scaleBadge, setScaleBadge] = useState<{ label: string; hCm: number; wCm: number } | null>(
    null
  );
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, inside: false });

  const stateRef = useRef({
    artifact,
    stageMode,
    lighting,
    flashlightOn,
    scaleRefOn,
    showHotspots,
    autoRotate,
    loreDrawerOpen,
    activeHotspotId,
  });
  stateRef.current = {
    artifact,
    stageMode,
    lighting,
    flashlightOn,
    scaleRefOn,
    showHotspots,
    autoRotate,
    loreDrawerOpen,
    activeHotspotId,
  };

  const apiRef = useRef<{
    loadArtifact: (a: Artifact) => () => void;
    syncCameraForMode: (mode: CameraStageMode, loreOpen: boolean, scaleOn: boolean) => void;
    focusHotspot: (h: Hotspot | null) => void;
    resetCamera: () => void;
    triggerPulse: () => void;
    updateLighting: (preset: LightingPreset, flash: boolean, mode: CameraStageMode) => void;
    setScaleVisible: (on: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x050608, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x06070a, 0.052);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.72;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 90);
    camera.position.set(0.4, 1.4, 5.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 1.35;
    controls.maxDistance = 11.5;
    controls.maxPolarAngle = Math.PI * 0.495; // Keep above sanctuary floor!
    controls.minPolarAngle = 0.16;

    // ==================== 3D OBSIDIAN SANCTUARY ARCHITECTURE ====================
    const ALTAR_TOP_Y = 0;
    const FLOOR_Y = -0.36;

    // 1. Wide dark obsidian floor inlaid with antique gold astronomical rings
    const floorTex = createSanctuaryFloorTexture();
    const floorMesh = new THREE.Mesh(
      new THREE.CircleGeometry(24, 72),
      new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: 0.48,
        metalness: 0.42,
      })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = FLOOR_Y;
    scene.add(floorMesh);

    // 2. Stepped Multi-Tier Obsidian & Brushed-Gold Relic Altar Pedestal
    const altarGroup = new THREE.Group();
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x0d0f14,
      roughness: 0.36,
      metalness: 0.65,
    });
    const goldMetalMat = new THREE.MeshStandardMaterial({
      color: 0xc9a465,
      roughness: 0.28,
      metalness: 0.88,
      emissive: 0x2b1e08,
      emissiveIntensity: 0.35,
    });

    // Lower broad plinth
    const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(1.78, 1.98, 0.16, 48), obsidianMat);
    tier1.position.y = FLOOR_Y + 0.08;
    altarGroup.add(tier1);

    // Upper altar slab
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.38, 0.2, 48), obsidianMat);
    tier2.position.y = FLOOR_Y + 0.26;
    altarGroup.add(tier2);

    // Brushed gold rim rings
    const rimTop = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.016, 16, 72), goldMetalMat);
    rimTop.rotation.x = Math.PI / 2;
    rimTop.position.y = ALTAR_TOP_Y - 0.005;
    altarGroup.add(rimTop);

    const rimLow = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.014, 14, 72), goldMetalMat);
    rimLow.rotation.x = Math.PI / 2;
    rimLow.position.y = FLOOR_Y + 0.16;
    altarGroup.add(rimLow);

    // Subtle glowing inner rune circle on top of altar
    const runeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 0.96, 64),
      new THREE.MeshBasicMaterial({
        color: 0xe6cb92,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
      })
    );
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = ALTAR_TOP_Y + 0.003;
    altarGroup.add(runeRing);
    scene.add(altarGroup);

    // 3. Distant Ring of Monumental Dark Obsidian Hall Pillars & Glowing Brazier Embers
    const hallArchGroup = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      roughness: 0.72,
      metalness: 0.28,
    });
    const pillarBandMat = new THREE.MeshStandardMaterial({
      color: 0x9b7a44,
      roughness: 0.38,
      metalness: 0.8,
      emissive: 0x261a07,
      emissiveIntensity: 0.4,
    });

    const pillarCount = 8;
    const pillarRadius = 13.6;
    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2 + Math.PI / 8;
      const px = Math.cos(angle) * pillarRadius;
      const pz = Math.sin(angle) * pillarRadius;

      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.58, 12.5, 12), pillarMat);
      col.position.set(px, FLOOR_Y + 6.25, pz);
      hallArchGroup.add(col);

      // Gold ceremonial bronze collar on each column
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.12, 12), pillarBandMat);
      band.position.set(px, FLOOR_Y + 2.6, pz);
      hallArchGroup.add(band);

      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.6, 1.18), pillarMat);
      plinth.position.set(px, FLOOR_Y + 0.3, pz);
      plinth.rotation.y = -angle;
      hallArchGroup.add(plinth);
    }

    // Subtle glowing horizontal architrave halo high above the sanctuary
    const oculusRing = new THREE.Mesh(
      new THREE.TorusGeometry(3.2, 0.04, 14, 64),
      new THREE.MeshBasicMaterial({ color: 0xc9a465, transparent: true, opacity: 0.22 })
    );
    oculusRing.rotation.x = Math.PI / 2;
    oculusRing.position.y = 6.4;
    hallArchGroup.add(oculusRing);
    scene.add(hallArchGroup);

    // 4. Overhead Volumetric-Style Gold God-Ray Cone descending onto the Altar
    const beamTex = createLightBeamTexture();
    const beamMat = new THREE.MeshBasicMaterial({
      map: beamTex,
      transparent: true,
      opacity: 0.58,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamCone = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 2.35, 7.6, 36, 1, true), beamMat);
    beamCone.position.y = 3.5;
    scene.add(beamCone);

    // 5. Summoning Golden Light Pillar Flash (triggers smoothly when swapping relics!)
    const summonMat = new THREE.MeshBasicMaterial({
      color: 0xf4dca5,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const summonCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(1.18, 1.24, 4.4, 48, 1, true),
      summonMat
    );
    summonCylinder.position.y = 2.0;
    scene.add(summonCylinder);
    let summonFlash = 0;

    // 6. Acoustic Sound Wave Shockwave Ring (Feature ④ visual feedback)
    const pulseRingMat = new THREE.MeshBasicMaterial({
      color: 0xf0d28c,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pulseRing = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.22, 64), pulseRingMat);
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.position.y = ALTAR_TOP_Y + 0.015;
    scene.add(pulseRing);
    let pulseProgress = 1.0;

    // 7. Drifting Golden Embers & Museum Dust Motes (Two depth layers for rich 3D parallax!)
    const emberCount = 190;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberSpeeds = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      const r = 1.2 + Math.random() * 8.5;
      const a = Math.random() * Math.PI * 2;
      emberPositions[i * 3] = Math.cos(a) * r;
      emberPositions[i * 3 + 1] = FLOOR_Y + Math.random() * 6.2;
      emberPositions[i * 3 + 2] = Math.sin(a) * r;
      emberSpeeds[i] = 0.08 + Math.random() * 0.22;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xf0cc82,
      size: 0.042,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const emberPoints = new THREE.Points(emberGeo, emberMat);
    scene.add(emberPoints);

    // ==================== STUDIO LIGHTING & VIRTUAL FLASHLIGHT ====================
    const keyLight = new THREE.DirectionalLight(0xffe5bd, 2.45);
    keyLight.position.set(3.5, 5.2, 4.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9bb5d6, 0.78);
    fillLight.position.set(-4.2, 2.2, 2.4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xeac378, 1.75);
    rimLight.position.set(-1.8, 3.8, -4.4);
    scene.add(rimLight);

    const altarUnderGlow = new THREE.PointLight(0xd9a854, 1.4, 7.5, 1.6);
    altarUnderGlow.position.set(0, 0.55, 0.9);
    scene.add(altarUnderGlow);

    const hemiLight = new THREE.HemisphereLight(0xf6e6c8, 0x16120c, 0.42);
    scene.add(hemiLight);

    // Virtual Raking Flashlight (Feature ②)
    const flashSpot = new THREE.SpotLight(0xfff1d2, 0, 18, Math.PI / 7.5, 0.52, 1.05);
    const flashTarget = new THREE.Object3D();
    scene.add(flashTarget);
    flashSpot.target = flashTarget;
    scene.add(flashSpot);

    const flashFill = new THREE.PointLight(0xffdf9e, 0, 5.5, 1.5);
    scene.add(flashFill);

    // Artifact Holder & Scale Reference Holder
    const artifactRoot = new THREE.Group();
    scene.add(artifactRoot);

    const scaleRefHolder = new THREE.Group();
    scaleRefHolder.visible = false;
    scene.add(scaleRefHolder);

    // Camera choreography & artifact bounds
    let currentNormBox = new THREE.Box3(
      new THREE.Vector3(-0.8, 0, -0.8),
      new THREE.Vector3(0.8, 2.1, 0.8)
    );
    let currentCenter = new THREE.Vector3(0, 1.05, 0);
    let currentNormSize = new THREE.Vector3(1.6, 2.1, 1.6);
    let artifactRevealScale = 1;

    let glideActive = false;
    let glideStart = 0;
    const glideDuration = 820;
    const camFrom = new THREE.Vector3();
    const camTo = new THREE.Vector3();
    const tgtFrom = new THREE.Vector3();
    const tgtTo = new THREE.Vector3();

    const startGlide = (pos: THREE.Vector3, tgt: THREE.Vector3) => {
      camFrom.copy(camera.position);
      camTo.copy(pos);
      tgtFrom.copy(controls.target);
      tgtTo.copy(tgt);
      glideStart = performance.now();
      glideActive = true;
    };

    // Compute ideal camera & target for each Game Mode (true vertical + horizontal FOV math for desktop & portrait mobile!)
    const computeModeFraming = (
      mode: CameraStageMode,
      loreOpen: boolean,
      scaleOn: boolean
    ): { pos: THREE.Vector3; tgt: THREE.Vector3 } => {
      const cw = container.clientWidth || window.innerWidth;
      const ch = container.clientHeight || window.innerHeight;
      const aspect = Math.max(cw / Math.max(ch, 1), 0.36);
      const isNarrow = cw <= 900;
      const targetFov = isNarrow && aspect < 0.8 ? 46 : 35;
      if (camera.fov !== targetFov) {
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      }
      const fovRad = (camera.fov * Math.PI) / 180;
      const halfTanV = Math.tan(fovRad / 2);
      const halfTanH = halfTanV * aspect;
      const art = stateRef.current.artifact;

      const viewAz = art.cameraView ? art.cameraView[0] : 0.28;
      const viewPol = art.cameraView ? art.cameraView[1] : 1.32;
      const elev = Math.PI / 2 - viewPol;

      const projH = currentNormSize.y * Math.cos(elev) + currentNormSize.z * Math.sin(elev);
      const projW = Math.max(currentNormSize.x, currentNormSize.z);
      const distV = (projH * 0.5) / halfTanV;
      const distH = (projW * 0.5) / halfTanH;
      const baseDist = Math.min(Math.max(distV, distH) * 1.38 + currentNormSize.z * 0.52, 10.6);

      const tgt = currentCenter.clone();
      let dist = baseDist;
      let az = viewAz;
      let el = elev;

      if (mode === 'title') {
        if (!isNarrow) {
          tgt.x -= 0.78;
          tgt.y -= 0.08;
          dist = baseDist * 1.16;
          az = 0.22;
          el = 0.16;
        } else {
          tgt.y -= 0.72;
          dist = Math.min(baseDist * 1.14, 9.6);
          az = 0.18;
          el = 0.18;
        }
      } else if (mode === 'hall') {
        if (!isNarrow) {
          tgt.y -= 0.06;
          dist = baseDist * 1.18;
          el = 0.2;
        } else {
          tgt.y -= 0.36;
          dist = Math.min(baseDist * 1.08, 9.2);
          el = 0.2;
        }
      } else if (mode === 'timeline') {
        tgt.y -= isNarrow ? 0.68 : 0.34;
        dist = baseDist * (isNarrow ? 1.18 : 1.24);
        el = 0.22;
      } else if (mode === 'codex') {
        dist = baseDist * 1.48;
        el = 0.28;
      } else {
        // 'inspect' mode
        if (!isNarrow && loreOpen) {
          tgt.x += 0.55;
        }
        if (scaleOn) {
          dist = baseDist * 1.28;
          if (!isNarrow && loreOpen) tgt.x += 0.22;
        } else {
          dist = baseDist * (isNarrow ? 1.08 : 1.04);
        }
      }

      const pos = new THREE.Vector3(
        tgt.x + Math.sin(az) * Math.cos(el) * dist,
        Math.max(FLOOR_Y + 0.45, tgt.y + Math.sin(el) * dist),
        tgt.z + Math.cos(az) * Math.cos(el) * dist
      );
      return { pos, tgt };
    };

    const getHotspotWorldPos = (h: Hotspot): THREE.Vector3 => {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      currentNormBox.getSize(size);
      currentNormBox.getCenter(center);
      const local = new THREE.Vector3(
        center.x + h.relPos[0] * (size.x * 0.5),
        currentNormBox.min.y + h.relPos[1] * size.y,
        center.z + h.relPos[2] * (size.z * 0.5)
      );
      return local.applyMatrix4(artifactRoot.matrixWorld);
    };

    const applyLighting = (preset: LightingPreset, flash: boolean, mode: CameraStageMode) => {
      const isFlash = flash && mode === 'inspect';
      const dim = isFlash ? 0.14 : 1.0;

      beamMat.opacity = isFlash ? 0.08 : mode === 'title' ? 0.68 : 0.46;

      if (preset === 'gallery') {
        keyLight.color.setHex(0xffe5bd);
        keyLight.intensity = 2.45 * dim;
        fillLight.color.setHex(0x9bb5d6);
        fillLight.intensity = 0.8 * dim;
        rimLight.color.setHex(0xeac378);
        rimLight.intensity = 1.75 * (isFlash ? 0.25 : 1.0);
        hemiLight.intensity = 0.42 * dim;
        altarUnderGlow.intensity = 1.35 * dim;
        scene.environmentIntensity = isFlash ? 0.14 : 0.74;
        renderer.toneMappingExposure = isFlash ? 1.08 : 1.16;
      } else if (preset === 'warm') {
        keyLight.color.setHex(0xffd088);
        keyLight.intensity = 2.75 * dim;
        fillLight.color.setHex(0xd9a86c);
        fillLight.intensity = 1.05 * dim;
        rimLight.color.setHex(0xffc978);
        rimLight.intensity = 1.5 * (isFlash ? 0.25 : 1.0);
        hemiLight.intensity = 0.55 * dim;
        altarUnderGlow.intensity = 1.8 * dim;
        scene.environmentIntensity = isFlash ? 0.16 : 0.86;
        renderer.toneMappingExposure = 1.18;
      } else {
        keyLight.color.setHex(0xffffff);
        keyLight.intensity = 2.55 * dim;
        fillLight.color.setHex(0xe8eff8);
        fillLight.intensity = 1.38 * dim;
        rimLight.color.setHex(0xf4f4f4);
        rimLight.intensity = 1.15 * (isFlash ? 0.25 : 1.0);
        hemiLight.intensity = 0.78 * dim;
        altarUnderGlow.intensity = 0.8 * dim;
        scene.environmentIntensity = isFlash ? 0.18 : 0.98;
        renderer.toneMappingExposure = 1.15;
      }

      flashSpot.intensity = isFlash ? 30.0 : 0;
      flashFill.intensity = isFlash ? 3.4 : 0;
    };

    const onControlStart = () => {
      glideActive = false;
    };
    controls.addEventListener('start', onControlStart);

    // Raycaster & pointer tracking for Virtual Flashlight + subtle title parallax
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(0, 0);
    const desiredFlashHit = new THREE.Vector3(0, 1, 0);
    const smoothedFlashHit = new THREE.Vector3(0, 1, 0);
    let pointerInside = false;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      pointerNdc.x = (x / rect.width) * 2 - 1;
      pointerNdc.y = -(y / rect.height) * 2 + 1;
      pointerInside = true;
      if (stateRef.current.flashlightOn && stateRef.current.stageMode === 'inspect') {
        setCursorPos({ x, y, inside: true });
      }
    };
    const handlePointerLeave = () => {
      pointerInside = false;
      setCursorPos((p) => (p.inside ? { ...p, inside: false } : p));
    };
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    let disposed = false;
    const loader = new GLTFLoader();
    // Simple in-memory cache of loaded GLTF scenes cloned on demand for snappy relic swapping!
    const modelCache = new Map<string, THREE.Group>();

    const mountModel = (art: Artifact, sourceScene: THREE.Group, isFirst: boolean) => {
      while (artifactRoot.children.length > 0) {
        artifactRoot.remove(artifactRoot.children[0]);
      }
      while (scaleRefHolder.children.length > 0) {
        scaleRefHolder.remove(scaleRefHolder.children[0]);
      }

      const model = sourceScene.clone(true);
      if (art.modelRotation) {
        model.rotation.set(art.modelRotation[0], art.modelRotation[1], art.modelRotation[2]);
      }
      model.updateMatrixWorld(true);

      const rawBox = new THREE.Box3().setFromObject(model);
      const rawSize = new THREE.Vector3();
      const rawCenter = new THREE.Vector3();
      rawBox.getSize(rawSize);
      rawBox.getCenter(rawCenter);

      const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z) || 1;
      const scale = TARGET_MAX_DIM / maxDim;

      model.scale.setScalar(scale);
      // Sit the bottom of every artifact cleanly RIGHT ON the obsidian altar surface (y = 0.015)!
      model.position.set(
        -rawCenter.x * scale,
        -rawBox.min.y * scale + ALTAR_TOP_Y + 0.02,
        -rawCenter.z * scale
      );

      artifactRoot.rotation.set(0, 0, 0);
      artifactRoot.add(model);
      artifactRoot.updateMatrixWorld(true);

      currentNormBox = new THREE.Box3().setFromObject(artifactRoot);
      currentNormBox.getSize(currentNormSize);
      currentNormBox.getCenter(currentCenter);

      // Build real-world scale reference prop
      const refBuilt = buildScaleReferenceGroup(art, currentNormBox);
      scaleRefHolder.add(refBuilt.group);
      scaleRefHolder.visible = stateRef.current.scaleRefOn && stateRef.current.stageMode === 'inspect';
      setScaleBadge({
        label: refBuilt.refLabel,
        hCm: art.dimensions.height,
        wCm: art.dimensions.width,
      });

      // Trigger ceremonial golden summoning animation!
      artifactRevealScale = isFirst ? 1.0 : 0.86;
      summonFlash = isFirst ? 0.35 : 1.0;

      const { pos, tgt } = computeModeFraming(
        stateRef.current.stageMode,
        stateRef.current.loreDrawerOpen,
        stateRef.current.scaleRefOn
      );
      if (isFirst) {
        camera.position.copy(pos);
        controls.target.copy(tgt);
        controls.update();
      } else {
        startGlide(pos, tgt);
      }
      setLoadingPct(100);
      setIsLoading(false);
    };

    let firstMount = true;

    const loadArtifact = (art: Artifact) => {
      let cancelled = false;
      setPins([]);

      const cached = modelCache.get(art.modelUrl);
      if (cached) {
        mountModel(art, cached, firstMount);
        firstMount = false;
        return () => {
          cancelled = true;
        };
      }

      setIsLoading(true);
      setLoadingPct(12);

      loader.load(
        art.modelUrl,
        (gltf) => {
          if (cancelled || disposed) return;
          const clean = gltf.scene;
          const toRm: THREE.Object3D[] = [];
          clean.traverse((obj) => {
            if ((obj as THREE.Light).isLight || (obj as THREE.Camera).isCamera) {
              toRm.push(obj);
            }
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat) => {
                if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                  const std = mat as THREE.MeshStandardMaterial;
                  std.envMapIntensity = 1.08;
                  std.needsUpdate = true;
                }
              });
            }
          });
          toRm.forEach((o) => o.parent?.remove(o));

          modelCache.set(art.modelUrl, clean);
          mountModel(art, clean, firstMount);
          firstMount = false;
        },
        (evt) => {
          if (cancelled) return;
          if (evt.total > 0) {
            setLoadingPct(Math.min(96, Math.round((evt.loaded / evt.total) * 100)));
          }
        },
        (err) => {
          if (cancelled) return;
          console.error('GLB load error:', err);
          setIsLoading(false);
        }
      );

      return () => {
        cancelled = true;
      };
    };

    apiRef.current = {
      loadArtifact,
      syncCameraForMode: (mode, loreOpen, scaleOn) => {
        controls.enabled = mode === 'inspect' || mode === 'hall';
        const { pos, tgt } = computeModeFraming(mode, loreOpen, scaleOn);
        startGlide(pos, tgt);
        applyLighting(stateRef.current.lighting, stateRef.current.flashlightOn, mode);
        scaleRefHolder.visible = scaleOn && mode === 'inspect';
      },
      focusHotspot: (h) => {
        if (!h) {
          const { pos, tgt } = computeModeFraming(
            stateRef.current.stageMode,
            stateRef.current.loreDrawerOpen,
            stateRef.current.scaleRefOn
          );
          startGlide(pos, tgt);
          return;
        }
        const wp = getHotspotWorldPos(h);
        const dir = new THREE.Vector3(h.camDir[0], h.camDir[1], h.camDir[2]).normalize();
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), artifactRoot.rotation.y);
        const closePos = wp.clone().addScaledVector(dir, 2.38);
        closePos.y = Math.max(FLOOR_Y + 0.5, closePos.y);
        startGlide(closePos, wp);
      },
      resetCamera: () => {
        artifactRoot.rotation.y = 0;
        const { pos, tgt } = computeModeFraming(
          stateRef.current.stageMode,
          stateRef.current.loreDrawerOpen,
          stateRef.current.scaleRefOn
        );
        startGlide(pos, tgt);
      },
      triggerPulse: () => {
        pulseProgress = 0;
      },
      updateLighting: applyLighting,
      setScaleVisible: (on) => {
        scaleRefHolder.visible = on && stateRef.current.stageMode === 'inspect';
        const { pos, tgt } = computeModeFraming(
          stateRef.current.stageMode,
          stateRef.current.loreDrawerOpen,
          on
        );
        startGlide(pos, tgt);
      },
    };

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(1, entry.contentRect.width);
        const h = Math.max(1, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        const { pos, tgt } = computeModeFraming(
          stateRef.current.stageMode,
          stateRef.current.loreDrawerOpen,
          stateRef.current.scaleRefOn
        );
        glideActive = false;
        camera.position.copy(pos);
        controls.target.copy(tgt);
        controls.update();
      }
    });
    ro.observe(container);

    const cancelInit = loadArtifact(stateRef.current.artifact);
    applyLighting(stateRef.current.lighting, stateRef.current.flashlightOn, stateRef.current.stageMode);
    controls.enabled = stateRef.current.stageMode === 'inspect' || stateRef.current.stageMode === 'hall';

    let rafId = 0;
    let lastPinSync = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      if (disposed) return;
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      const st = stateRef.current;

      // Drifting golden embers rising lazily in the dark hall
      const posAttr = emberGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < emberCount; i++) {
        let y = posAttr.getY(i) + emberSpeeds[i] * dt;
        if (y > 5.8) y = FLOOR_Y + 0.1;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
      emberPoints.rotation.y = elapsed * 0.022;
      runeRing.rotation.z = elapsed * 0.12;

      // Relic summoning rise & golden pillar decay
      if (artifactRevealScale < 1.0) {
        artifactRevealScale = Math.min(1.0, artifactRevealScale + dt * 1.8);
        const ease = 1 - Math.pow(1 - artifactRevealScale, 3);
        artifactRoot.scale.setScalar(0.86 + ease * 0.14);
      } else {
        artifactRoot.scale.setScalar(1);
      }
      if (summonFlash > 0) {
        summonFlash = Math.max(0, summonFlash - dt * 1.45);
        summonMat.opacity = summonFlash * 0.24;
        summonCylinder.scale.set(1 + (1 - summonFlash) * 0.25, 1, 1 + (1 - summonFlash) * 0.25);
      } else {
        summonMat.opacity = 0;
      }

      // Relic gentle turntable rotation
      const shouldRotate =
        st.stageMode === 'title' ||
        st.stageMode === 'timeline' ||
        st.stageMode === 'codex' ||
        st.stageMode === 'hall' ||
        (st.stageMode === 'inspect' && st.autoRotate && !st.activeHotspotId && !st.flashlightOn && !glideActive);

      if (shouldRotate) {
        artifactRoot.rotation.y += dt * (st.stageMode === 'title' ? 0.22 : 0.18);
      }

      // Subtle living breath on Title camera
      if (st.stageMode === 'title' && !glideActive && pointerInside) {
        const { pos, tgt } = computeModeFraming('title', false, false);
        camera.position.x += (pos.x + pointerNdc.x * 0.28 - camera.position.x) * 0.03;
        camera.position.y += (pos.y + pointerNdc.y * 0.14 - camera.position.y) * 0.03;
        camera.lookAt(tgt);
      }

      // Smooth cinematic camera glide
      if (glideActive) {
        const t = Math.min(1, (performance.now() - glideStart) / glideDuration);
        const ease = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(camFrom, camTo, ease);
        controls.target.lerpVectors(tgtFrom, tgtTo, ease);
        if (t >= 1) glideActive = false;
      }

      controls.update();

      // Virtual Raking Flashlight (Feature ②)
      if (st.flashlightOn && st.stageMode === 'inspect') {
        if (pointerInside) {
          raycaster.setFromCamera(pointerNdc, camera);
          const hits = raycaster.intersectObjects(artifactRoot.children, true);
          if (hits.length > 0) {
            desiredFlashHit.copy(hits[0].point);
          } else {
            const camDir = new THREE.Vector3();
            camera.getWorldDirection(camDir);
            const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(camDir.negate(), currentCenter);
            const pt = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(plane, pt)) desiredFlashHit.copy(pt);
          }
        } else {
          desiredFlashHit.set(
            Math.sin(elapsed * 1.1) * 0.65,
            currentCenter.y + Math.cos(elapsed * 0.85) * 0.4,
            0.35
          );
        }
        smoothedFlashHit.lerp(desiredFlashHit, 0.22);

        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        flashSpot.position
          .copy(camera.position)
          .addScaledVector(camRight, pointerNdc.x * 1.45 + 0.65)
          .addScaledVector(camUp, pointerNdc.y * 1.1 + 0.55);
        flashTarget.position.copy(smoothedFlashHit);
        flashTarget.updateMatrixWorld();

        const towardCam = camera.position.clone().sub(smoothedFlashHit).normalize();
        flashFill.position.copy(smoothedFlashHit).addScaledVector(towardCam, 0.72);
      }

      // Acoustic wave shockwave ring (Feature ④)
      if (pulseProgress < 1.0) {
        pulseProgress = Math.min(1.0, pulseProgress + dt * 1.1);
        pulseRing.scale.setScalar(0.85 + pulseProgress * 2.5);
        pulseRingMat.opacity = (1 - pulseProgress) * 0.85;
      } else {
        pulseRingMat.opacity = 0;
      }

      renderer.render(scene, camera);

      // Project 3D Hotspot Pins in Inspect Mode
      if (st.stageMode === 'inspect' && st.showHotspots && artifactRoot.children.length > 0) {
        const now = performance.now();
        if (now - lastPinSync > 32) {
          lastPinSync = now;
          const cw = renderer.domElement.clientWidth;
          const ch = renderer.domElement.clientHeight;
          artifactRoot.updateMatrixWorld(true);
          const camPos = camera.position;
          const centerDist = camPos.distanceTo(currentCenter);

          const nextPins: ProjectedPin[] = st.artifact.hotspots.map((h, idx) => {
            const wp = getHotspotWorldPos(h);
            const pinDist = camPos.distanceTo(wp);
            const ndc = wp.clone().project(camera);
            const visible =
              ndc.z > -1 && ndc.z < 1 && ndc.x > -1.04 && ndc.x < 1.04 && ndc.y > -1.04 && ndc.y < 1.04;
            return {
              hotspot: h,
              x: (ndc.x * 0.5 + 0.5) * cw,
              y: (-ndc.y * 0.5 + 0.5) * ch,
              visible,
              occluded: pinDist > centerDist + 0.45,
              index: idx + 1,
            };
          });
          setPins(nextPins);
        }
      }
    };

    animate();

    return () => {
      disposed = true;
      cancelInit();
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      floorTex.dispose();
      beamTex.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      apiRef.current = null;
    };
  }, []);

  // Swap relic model smoothly without destroying the 3D sanctuary!
  const prevArtId = useRef(artifact.id);
  useEffect(() => {
    if (prevArtId.current === artifact.id) return;
    prevArtId.current = artifact.id;
    return apiRef.current?.loadArtifact(artifact);
  }, [artifact]);

  // Smooth camera choreography whenever stageMode or loreDrawer changes
  useEffect(() => {
    apiRef.current?.syncCameraForMode(stageMode, loreDrawerOpen, scaleRefOn);
  }, [stageMode, loreDrawerOpen]);

  // Lighting & flashlight updates
  useEffect(() => {
    apiRef.current?.updateLighting(lighting, flashlightOn, stageMode);
  }, [lighting, flashlightOn, stageMode]);

  // Scale reference toggle
  useEffect(() => {
    apiRef.current?.setScaleVisible(scaleRefOn);
  }, [scaleRefOn]);

  // Focus active 3D hotspot
  useEffect(() => {
    if (!activeHotspotId) return;
    const found = artifact.hotspots.find((h) => h.id === activeHotspotId) || null;
    apiRef.current?.focusHotspot(found);
  }, [activeHotspotId, artifact]);

  // Reset camera
  useEffect(() => {
    if (resetSignal > 0) apiRef.current?.resetCamera();
  }, [resetSignal]);

  // Acoustic shockwave ripple
  useEffect(() => {
    if (pulseSignal > 0) apiRef.current?.triggerPulse();
  }, [pulseSignal]);

  return (
    <div
      ref={containerRef}
      className={`sanctuary-canvas ${flashlightOn && stageMode === 'inspect' ? 'is-flashlight' : ''}`}
    >
      {/* Dramatic cinematic edge vignette */}
      <div className="sanctuary-vignette" aria-hidden="true" />

      {/* Virtual Flashlight Reticle */}
      {stageMode === 'inspect' && flashlightOn && cursorPos.inside && (
        <div
          className="flashlight-reticle"
          style={{ transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)` }}
          aria-hidden="true"
        />
      )}

      {/* 3D Spatial Hotspot Pins (Inspect Mode) */}
      {stageMode === 'inspect' && showHotspots && !isLoading && (
        <div className="hotspot-overlay">
          {pins.map((pin) => {
            if (!pin.visible) return null;
            const isActive = activeHotspotId === pin.hotspot.id;
            return (
              <button
                key={pin.hotspot.id}
                type="button"
                className={`game-hotspot-pin ${isActive ? 'is-active' : ''} ${
                  pin.occluded && !isActive ? 'is-back' : ''
                }`}
                style={{ left: `${pin.x}px`, top: `${pin.y}px` }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectHotspot(isActive ? null : pin.hotspot);
                }}
              >
                <span className="game-pin-diamond">
                  <i>{pin.index}</i>
                </span>
                <span className="game-pin-label">{pin.hotspot.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Real-world Scale HUD badge */}
      {stageMode === 'inspect' && scaleRefOn && scaleBadge && !isLoading && (
        <div className="game-scale-hud">
          <div className="game-hud-kicker">实测厘米比例尺</div>
          <div className="game-scale-line">
            <span>文物：高 {scaleBadge.hCm} cm × 宽 {scaleBadge.wCm} cm</span>
            <em>参照：{scaleBadge.label}</em>
          </div>
          <p>{artifact.dimensions.scaleCompareText}</p>
        </div>
      )}

      {/* Flashlight active HUD hint */}
      {stageMode === 'inspect' && flashlightOn && !isLoading && (
        <div className="game-flash-banner">
          ◆ 斜光鉴宝已开启 · 游走指针细察铭文与暗纹 ◆
        </div>
      )}

      {/* Diegetic Golden Loading Crest */}
      {isLoading && (
        <div className="sanctuary-loader">
          <div className="sanctuary-loader-diamond">
            <span>{loadingPct}%</span>
          </div>
          <div className="sanctuary-loader-label">灵台显影 · {artifact.name}</div>
        </div>
      )}
    </div>
  );
};
