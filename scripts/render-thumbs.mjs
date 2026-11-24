import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const modelsDir = path.join(rootDir, 'public', 'models');
const thumbsDir = path.join(rootDir, 'public', 'thumbs');
const threeBuildDir = path.join(rootDir, 'node_modules', 'three', 'build');
const threeExamplesDir = path.join(rootDir, 'node_modules', 'three', 'examples', 'jsm');

fs.mkdirSync(thumbsDir, { recursive: true });

// Final verified 20-artifact orientation & hero angle config
const MODEL_CONFIGS = [
  { id: '01-shang-tiger-ding', file: '01-shang-tiger-ding.glb', rot: [0, 0.44, 0], elev: 0.2, pad: 1.32 },
  { id: '02-han-gilt-horse-stand', file: '02-han-gilt-horse-stand.glb', rot: [0, 0.48, 0], elev: 0.22, pad: 1.36 },
  { id: '03-han-changyi-ding', file: '03-han-changyi-ding.glb', rot: [0, 0.25, 0], elev: 0.24, pad: 1.35 },
  { id: '04-han-gilt-bianzhong', file: '04-han-gilt-bianzhong.glb', rot: [0, 0.2, 0], elev: 0.14, pad: 1.34 },
  { id: '05-han-bronze-sheng', file: '05-han-bronze-sheng.glb', rot: [0, 0.42, 0], elev: 0.15, pad: 1.34 },
  { id: '06-shang-jade-mask', file: '06-shang-jade-mask.glb', rot: [0, 0.16, 0], elev: 0.1, pad: 1.34 },
  { id: '07-han-jade-bi', file: '07-han-jade-bi.glb', rot: [0, 0.18, 0], elev: 0.12, pad: 1.34 },
  { id: '08-han-jade-dancer', file: '08-han-jade-dancer.glb', rot: [0, 0.2, 0], elev: 0.1, pad: 1.34 },
  { id: '09-east-han-mirror', file: '09-east-han-mirror.glb', rot: [0, 0.24, 0], elev: 0.12, pad: 1.34 },
  { id: '10-ming-gold-hairpin', file: '10-ming-gold-hairpin.glb', rot: [0, 0.14, 0], elev: 0.14, pad: 1.35 },
  { id: '11-han-goose-lamp', file: '11-han-goose-lamp.glb', rot: [0, 0.36, 0], elev: 0.18, pad: 1.34 },
  { id: '12-han-nanchang-lamp', file: '12-han-nanchang-lamp.glb', rot: [0, Math.PI, 0], elev: 0.2, pad: 1.34 },
  { id: '13-han-boshan-censer', file: '13-han-boshan-censer.glb', rot: [0, 0.3, 0], elev: 0.24, pad: 1.34 },
  { id: '14-han-warming-ding', file: '14-han-warming-ding.glb', rot: [0, 0.35, 0], elev: 0.24, pad: 1.36 },
  { id: '15-han-bamboo-paixiao', file: '15-han-bamboo-paixiao.glb', rot: [0, 0.18, 0], elev: 0.12, pad: 1.34 },
  { id: '16-song-silver-plate', file: '16-song-silver-plate.glb', rot: [0, 0.18, 0], elev: 0.18, pad: 1.34 },
  { id: '17-yuan-zhangcheng-lacquer', file: '17-yuan-zhangcheng-lacquer.glb', rot: [0, 0.28, 0], elev: 0.3, pad: 1.36 },
  { id: '18-qing-kangxi-jar', file: '18-qing-kangxi-jar.glb', rot: [0, 0.3, 0], elev: 0.16, pad: 1.34 },
  { id: '19-qing-vermilion-bowl', file: '19-qing-vermilion-bowl.glb', rot: [0, 0.25, 0], elev: 0.24, pad: 1.36 },
  { id: '20-minguo-plum-armrest', file: '20-minguo-plum-armrest.glb', rot: [0, 0.42, 0], elev: 0.42, pad: 1.36 },
];

const HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<script type="importmap">
{
  "imports": {
    "three": "/three/three.module.js",
    "three/addons/": "/three-addons/"
  }
}
</script>
</head>
<body style="margin:0;background:#07080B;">
<canvas id="c" width="720" height="720"></canvas>
<canvas id="sheet" width="1800" height="1440" style="display:none"></canvas>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const configs = ${JSON.stringify(MODEL_CONFIGS)};
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
renderer.setSize(720, 720, false);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const scene = new THREE.Scene();
scene.environment = envTex;
scene.environmentIntensity = 0.72;

// Warm obsidian museum studio lights
const keyLight = new THREE.DirectionalLight(0xffe7c2, 2.4);
keyLight.position.set(3.2, 4.6, 3.8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xa8bdd6, 0.85);
fillLight.position.set(-3.8, 2.2, 2.0);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xe5bd74, 1.55);
rimLight.position.set(-1.5, 3.6, -4.0);
scene.add(rimLight);

const hemi = new THREE.HemisphereLight(0xf6e6c8, 0x1a1510, 0.45);
scene.add(hemi);

// Subtle dark gold museum floor ring
const ringGeo = new THREE.RingGeometry(0.92, 0.955, 64);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xc9a465, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.y = -1.04;
scene.add(ring);

const innerDisk = new THREE.Mesh(
  new THREE.CircleGeometry(0.92, 64),
  new THREE.MeshStandardMaterial({ color: 0x12141a, roughness: 0.65, metalness: 0.3, transparent: true, opacity: 0.75 })
);
innerDisk.rotation.x = -Math.PI / 2;
innerDisk.position.y = -1.045;
scene.add(innerDisk);

const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
const loader = new GLTFLoader();

// Background compositor canvas
const comp = document.createElement('canvas');
comp.width = 720;
comp.height = 720;
const cctx = comp.getContext('2d');

const sheet = document.getElementById('sheet');
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#07080B';
sctx.fillRect(0, 0, sheet.width, sheet.height);

const stats = [];

for (let i = 0; i < configs.length; i++) {
  const cfg = configs[i];
  try {
    const gltf = await loader.loadAsync('/models/' + cfg.file);
    const root = new THREE.Group();
    const model = gltf.scene;

    // Strip embedded lights/cameras and enhance dark materials subtly
    const toRemove = [];
    model.traverse((obj) => {
      if (obj.isLight || obj.isCamera) toRemove.push(obj);
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m.isMeshStandardMaterial) {
            m.envMapIntensity = 1.05;
            m.needsUpdate = true;
          }
        }
      }
    });
    toRemove.forEach((o) => o.parent && o.parent.remove(o));

    // Measure raw bounds before custom rotation
    const rawBox = new THREE.Box3().setFromObject(model);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);

    // Apply custom rotation
    model.rotation.set(cfg.rot[0], cfg.rot[1], cfg.rot[2]);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.92 / maxDim;

    model.position.set(-center.x * scale, -box.min.y * scale - 1.02, -center.z * scale);
    model.scale.setScalar(scale);
    root.add(model);
    scene.add(root);

    // Compute normalized box for framing
    const normBox = new THREE.Box3().setFromObject(root);
    const normCenter = new THREE.Vector3();
    const normSize = new THREE.Vector3();
    normBox.getCenter(normCenter);
    normBox.getSize(normSize);

    // Position pedestal just under model bottom, scaled to footprint
    const footR = Math.max(Math.min(Math.max(normSize.x, normSize.z) * 0.62, 1.05), 0.52);
    ring.scale.setScalar(footR / 0.94);
    innerDisk.scale.setScalar(footR / 0.92);
    ring.position.y = normBox.min.y - 0.025;
    innerDisk.position.y = normBox.min.y - 0.03;

    // Exact frustum fitting so ZERO top/bottom/side cropping ever happens
    const fovRad = (34 * Math.PI) / 180;
    const halfTan = Math.tan(fovRad / 2);
    const elev = cfg.elev || 0.2;
    const projH = normSize.y * Math.cos(elev) + normSize.z * Math.sin(elev);
    const projW = normSize.x;
    const pad = cfg.pad || 1.34;
    const dist = (Math.max(projH, projW) * 0.5 / halfTan) * pad + normSize.z * 0.55;
    camera.position.set(0, normCenter.y + Math.sin(elev) * dist, Math.cos(elev) * dist);
    camera.lookAt(normCenter.x, normCenter.y - 0.02, normCenter.z);

    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scene, camera);

    // Compose onto dark-gold museum gradient background
    const grad = cctx.createRadialGradient(360, 290, 40, 360, 380, 460);
    grad.addColorStop(0, '#1e1b16');
    grad.addColorStop(0.5, '#0f1015');
    grad.addColorStop(1, '#07080b');
    cctx.fillStyle = grad;
    cctx.fillRect(0, 0, 720, 720);

    // Soft gold spotlight cone from top
    const spot = cctx.createRadialGradient(360, 40, 10, 360, 220, 380);
    spot.addColorStop(0, 'rgba(218, 181, 114, 0.16)');
    spot.addColorStop(0.6, 'rgba(201, 164, 101, 0.04)');
    spot.addColorStop(1, 'rgba(0, 0, 0, 0)');
    cctx.fillStyle = spot;
    cctx.fillRect(0, 0, 720, 720);

    cctx.drawImage(canvas, 0, 0);

    const dataUrl = comp.toDataURL('image/png');
    await fetch('/save-thumb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: cfg.id,
        dataUrl,
        rawSize: [+rawSize.x.toFixed(3), +rawSize.y.toFixed(3), +rawSize.z.toFixed(3)],
        normSize: [+normSize.x.toFixed(3), +normSize.y.toFixed(3), +normSize.z.toFixed(3)]
      })
    });

    // Draw into 5x4 contact sheet
    const col = i % 5;
    const row = Math.floor(i / 5);
    sctx.drawImage(comp, col * 360, row * 360, 360, 360);
    sctx.fillStyle = 'rgba(7,8,11,0.72)';
    sctx.fillRect(col * 360, row * 360 + 324, 360, 36);
    sctx.fillStyle = '#E2C286';
    sctx.font = 'bold 16px sans-serif';
    sctx.fillText(cfg.id, col * 360 + 10, row * 360 + 347);

    scene.remove(root);
    stats.push({ id: cfg.id, ok: true, rawSize: [+rawSize.x.toFixed(2), +rawSize.y.toFixed(2), +rawSize.z.toFixed(2)] });
  } catch (err) {
    stats.push({ id: cfg.id, ok: false, err: String(err) });
  }
}

await fetch('/save-sheet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ dataUrl: sheet.toDataURL('image/png'), stats })
});

await fetch('/done', { method: 'POST' });
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);

  if (req.method === 'GET' && urlPath === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
    return;
  }

  if (req.method === 'GET' && urlPath.startsWith('/three/')) {
    const file = path.join(threeBuildDir, urlPath.slice('/three/'.length));
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      fs.createReadStream(file).pipe(res);
      return;
    }
  }

  if (req.method === 'GET' && urlPath.startsWith('/three-addons/')) {
    const file = path.join(threeExamplesDir, urlPath.slice('/three-addons/'.length));
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      fs.createReadStream(file).pipe(res);
      return;
    }
  }

  if (req.method === 'GET' && urlPath.startsWith('/models/')) {
    const file = path.join(modelsDir, urlPath.slice('/models/'.length));
    if (fs.existsSync(file)) {
      res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
      fs.createReadStream(file).pipe(res);
      return;
    }
  }

  if (req.method === 'POST' && (urlPath === '/save-thumb' || urlPath === '/save-sheet' || urlPath === '/done')) {
    let body = '';
    for await (const chunk of req) body += chunk;

    if (urlPath === '/save-thumb') {
      const { id, dataUrl, rawSize, normSize } = JSON.parse(body);
      const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(path.join(thumbsDir, `${id}.png`), Buffer.from(b64, 'base64'));
      console.log(`RENDERED: ${id}.png | raw:[${rawSize.join(',')}] norm:[${normSize.join(',')}]`);
      res.writeHead(200);
      res.end('ok');
      return;
    }

    if (urlPath === '/save-sheet') {
      const { dataUrl, stats } = JSON.parse(body);
      const b64 = dataUrl.replace(/^data:image\/png;base64,/, '');
      const scratchDir = 'C:\\Users\\17851\\.gemini\\antigravity\\brain\\7b602e9f-ce4c-4bc5-8286-de2199c206e0\\scratch';
      fs.mkdirSync(scratchDir, { recursive: true });
      fs.writeFileSync(path.join(scratchDir, 'thumb-contact-sheet.png'), Buffer.from(b64, 'base64'));
      console.log('CONTACT SHEET SAVED! Summary:', stats.filter((s) => s.ok).length + '/' + stats.length);
      const failed = stats.filter((s) => !s.ok);
      if (failed.length) console.error('FAILED:', failed);
      res.writeHead(200);
      res.end('ok');
      return;
    }

    if (urlPath === '/done') {
      res.writeHead(200);
      res.end('bye');
      setTimeout(() => {
        if (edgeProc) edgeProc.kill();
        server.close(() => process.exit(0));
      }, 200);
      return;
    }
  }

  res.writeHead(404);
  res.end('not found');
});

let edgeProc = null;

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/`;
  console.log('Thumb studio server listening on', url);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  edgeProc = spawn(
    edgePath,
    [
      '--headless=new',
      '--disable-gpu-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=800,800',
      url,
    ],
    { stdio: 'pipe' }
  );

  edgeProc.stderr.on('data', (d) => {
    const s = d.toString();
    if (s.includes('ERROR') || s.includes('FATAL')) process.stderr.write('[edge] ' + s);
  });

  setTimeout(() => {
    console.error('TIMEOUT waiting for thumbnail render!');
    if (edgeProc) edgeProc.kill();
    server.close(() => process.exit(1));
  }, 120000);
});
