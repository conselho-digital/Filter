const VISION_BUNDLE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs";
const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const FINGER_MARGIN = 1.1;
const HISTORY_LEN = 5;
const HAND_TIMEOUT_MS = 500;
const BLINK_CLOSE_THRESHOLD = 0.5;
const BLINK_OPEN_THRESHOLD = 0.3;
const BLINK_COOLDOWN_MS = 700;
const DARKEN_ALPHA = 0.35;

const SHAPE_NAMES = {
  rect: "Retângulo",
  quad: "Livre",
  fullscreen: "Tela Toda",
};
const FILTER_NAMES = ["Inversão", "P&B", "Neon", "Espelho"];

const video = document.getElementById("camera-feed");
const canvas = document.getElementById("output-canvas");
const ctx = canvas.getContext("2d");
const hud = document.getElementById("hud");
const hudShape = document.getElementById("hud-shape");
const hudFilter = document.getElementById("hud-filter");
const loadingIndicator = document.getElementById("loading-indicator");
const errorBanner = document.getElementById("error-banner");
const startBtn = document.getElementById("start-btn");
const toggleCameraBtn = document.getElementById("toggle-camera-btn");

const state = {
  handLandmarker: null,
  faceLandmarker: null,
  stream: null,
  facingMode: "user",
  running: false,
  rafId: null,

  fingerHistory: { left: [], right: [] },
  lastLeftSeenAt: 0,
  lastRightSeenAt: 0,

  windowMode: "fullscreen",
  windowPoints: null,

  filterIndex: null, // null = nenhum filtro; 0-3 = índice em FILTER_NAMES

  blinkPhase: "open",
  lastBlinkCycleAt: 0,

  hudShapeText: "",
  hudFilterText: "",
};

// ---------- geometria ----------

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function toPixel(landmark, w, h) {
  return { x: landmark.x * w, y: landmark.y * h };
}

function modeOfArray(arr) {
  const counts = new Map();
  let best = arr[0];
  let bestCount = 0;
  for (const v of arr) {
    const c = (counts.get(v) || 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      bestCount = c;
      best = v;
    }
  }
  return best;
}

function orderPointsAroundCentroid(points) {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return [...points].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
  );
}

function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    area += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(area / 2);
}

function bboxOfPoints(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const w = Math.max(...xs) - x;
  const h = Math.max(...ys) - y;
  return { x, y, w, h };
}

// ---------- contagem de dedos ----------

const FINGER_TIPS_PIPS = [
  [8, 6], // indicador
  [12, 10], // médio
  [16, 14], // anelar
  [20, 18], // mindinho
];

function isFingerExtended(lm, tipIdx, pipIdx) {
  const wrist = lm[0];
  return dist(wrist, lm[tipIdx]) > dist(wrist, lm[pipIdx]) * FINGER_MARGIN;
}

function isThumbExtended(lm) {
  const pinkyMcp = lm[17];
  return dist(lm[4], pinkyMcp) > dist(lm[3], pinkyMcp) * FINGER_MARGIN;
}

function countExtendedFingers(lm) {
  let count = isThumbExtended(lm) ? 1 : 0;
  for (const [tip, pip] of FINGER_TIPS_PIPS) {
    if (isFingerExtended(lm, tip, pip)) count++;
  }
  return count;
}

function pushHistory(role, count) {
  const hist = state.fingerHistory[role];
  hist.push(count);
  if (hist.length > HISTORY_LEN) hist.shift();
  return modeOfArray(hist);
}

// ---------- classificação de mãos (correção de handedness) ----------
// O MediaPipe assume que a imagem de entrada já está espelhada (visão selfie).
// Aqui alimentamos o vídeo cru (não espelhado), então o rótulo retornado é o
// oposto anatômico e precisa ser invertido sempre, independente da câmera.
function anatomicalHandRole(mpCategoryName) {
  return mpCategoryName === "Left" ? "right" : "left";
}

function classifyHands(handResult) {
  const hands = { left: null, right: null };
  if (!handResult || !handResult.landmarks) return hands;

  for (let i = 0; i < handResult.landmarks.length; i++) {
    const landmarks = handResult.landmarks[i];
    const handedness = handResult.handednesses[i]?.[0]?.categoryName;
    if (!handedness) continue;
    const role = anatomicalHandRole(handedness);
    hands[role] = landmarks;
  }
  return hands;
}

// ---------- janela: formato ----------

function computeWindowPolygon(hands, leftCount, w, h, now) {
  if (hands.left) state.lastLeftSeenAt = now;
  if (hands.right) state.lastRightSeenAt = now;

  const leftTimedOut = now - state.lastLeftSeenAt > HAND_TIMEOUT_MS;

  let mode = state.windowMode;
  if (!leftTimedOut && leftCount >= 1 && leftCount <= 3) {
    mode = leftCount === 1 ? "rect" : leftCount === 2 ? "quad" : "fullscreen";
  } else if (leftTimedOut) {
    mode = "fullscreen";
  }
  state.windowMode = mode;

  if (mode === "fullscreen") {
    state.windowPoints = null;
    return;
  }

  if (mode === "rect") {
    const cx = w / 2;
    const cy = h / 2;
    let handDist = w * 0.35;
    if (hands.left && hands.right) {
      const lw = toPixel(hands.left[0], w, h);
      const rw = toPixel(hands.right[0], w, h);
      handDist = dist(lw, rw);
    }
    const rectW = clamp(handDist * 0.9, w * 0.15, w * 0.9);
    const rectH = clamp(rectW * 1.2, h * 0.15, h * 0.9);
    state.windowPoints = [
      { x: cx - rectW / 2, y: cy - rectH / 2 },
      { x: cx + rectW / 2, y: cy - rectH / 2 },
      { x: cx + rectW / 2, y: cy + rectH / 2 },
      { x: cx - rectW / 2, y: cy + rectH / 2 },
    ];
    return;
  }

  if (mode === "quad") {
    if (hands.left && hands.right) {
      const pts = [
        toPixel(hands.left[8], w, h), // indicador esquerdo
        toPixel(hands.left[4], w, h), // polegar esquerdo
        toPixel(hands.right[8], w, h), // indicador direito
        toPixel(hands.right[4], w, h), // polegar direito
      ];
      const ordered = orderPointsAroundCentroid(pts);
      if (polygonArea(ordered) > (w * h) / 400) {
        state.windowPoints = ordered;
      }
      // se degenerado, mantém o polígono anterior (state.windowPoints intacto)
    }
    if (!state.windowPoints) {
      // ainda sem polígono válido: usa um quadrado central como ponto de partida
      const s = Math.min(w, h) * 0.4;
      state.windowPoints = [
        { x: w / 2 - s / 2, y: h / 2 - s / 2 },
        { x: w / 2 + s / 2, y: h / 2 - s / 2 },
        { x: w / 2 + s / 2, y: h / 2 + s / 2 },
        { x: w / 2 - s / 2, y: h / 2 + s / 2 },
      ];
    }
  }
}

// ---------- piscada ----------

function getBlendshapeScore(categories, name) {
  const found = categories.find((c) => c.categoryName === name);
  return found ? found.score : 0;
}

function detectBlink(faceResult, now) {
  const blendshapes = faceResult?.faceBlendshapes?.[0]?.categories;
  if (!blendshapes) return false;

  const leftScore = getBlendshapeScore(blendshapes, "eyeBlinkLeft");
  const rightScore = getBlendshapeScore(blendshapes, "eyeBlinkRight");

  let fired = false;
  if (
    state.blinkPhase === "open" &&
    leftScore > BLINK_CLOSE_THRESHOLD &&
    rightScore > BLINK_CLOSE_THRESHOLD
  ) {
    state.blinkPhase = "closed";
    if (now - state.lastBlinkCycleAt > BLINK_COOLDOWN_MS) {
      fired = true;
      state.lastBlinkCycleAt = now;
    }
  } else if (
    state.blinkPhase === "closed" &&
    leftScore < BLINK_OPEN_THRESHOLD &&
    rightScore < BLINK_OPEN_THRESHOLD
  ) {
    state.blinkPhase = "open";
  }
  return fired;
}

// ---------- resolução do filtro ----------

function resolveFilter(hands, rightCount, now, blinkFired) {
  const rightTimedOut = now - state.lastRightSeenAt > HAND_TIMEOUT_MS;

  if (!rightTimedOut && hands.right && rightCount >= 1 && rightCount <= 4) {
    state.filterIndex = rightCount - 1;
  } else if (blinkFired) {
    state.filterIndex = state.filterIndex === null ? 0 : (state.filterIndex + 1) % 4;
  } else if (rightTimedOut) {
    state.filterIndex = null;
  }
}

// ---------- desenho ----------

function buildPath(points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

function drawFilteredRegion(bbox) {
  const filter = state.filterIndex;
  if (filter === 3) {
    // Espelhamento / split: composição manual, não usa ctx.filter
    ctx.filter = "none";
    const halfW = bbox.w / 2;
    ctx.drawImage(video, bbox.x, bbox.y, halfW, bbox.h, bbox.x, bbox.y, halfW, bbox.h);
    ctx.save();
    ctx.translate(bbox.x + bbox.w, bbox.y);
    ctx.scale(-1, 1);
    ctx.drawImage(video, bbox.x, bbox.y, halfW, bbox.h, 0, 0, halfW, bbox.h);
    ctx.restore();
    return;
  }

  if (filter === 0) {
    ctx.filter = "invert(1)";
  } else if (filter === 1) {
    ctx.filter = "grayscale(1) contrast(1.4) brightness(1.05)";
  } else if (filter === 2) {
    const deg = (performance.now() / 10) % 360;
    ctx.filter = `hue-rotate(${deg}deg) saturate(2.2) brightness(1.15) contrast(1.1)`;
  } else {
    ctx.filter = "none";
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";
}

function drawFrame() {
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return;

  ctx.save();
  if (state.facingMode === "user") {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  if (state.windowMode === "fullscreen") {
    drawFilteredRegion({ x: 0, y: 0, w, h });
  } else {
    ctx.filter = "none";
    ctx.drawImage(video, 0, 0, w, h);
    ctx.fillStyle = `rgba(0,0,0,${DARKEN_ALPHA})`;
    ctx.fillRect(0, 0, w, h);

    if (state.windowPoints) {
      ctx.save();
      buildPath(state.windowPoints);
      ctx.clip();
      const bbox = bboxOfPoints(state.windowPoints);
      drawFilteredRegion(bbox);
      ctx.restore();
    }
  }

  ctx.restore();
}

function updateHud() {
  const shapeText = SHAPE_NAMES[state.windowMode] || "—";
  const filterText = state.filterIndex === null ? "Nenhum" : FILTER_NAMES[state.filterIndex];

  if (shapeText !== state.hudShapeText) {
    hudShape.textContent = `Janela: ${shapeText}`;
    state.hudShapeText = shapeText;
  }
  if (filterText !== state.hudFilterText) {
    hudFilter.textContent = `Filtro: ${filterText}`;
    state.hudFilterText = filterText;
  }
}

// ---------- loop principal ----------

function renderLoop() {
  if (!state.running) return;
  const now = performance.now();

  let handResult = null;
  let faceResult = null;
  try {
    handResult = state.handLandmarker.detectForVideo(video, now);
    faceResult = state.faceLandmarker.detectForVideo(video, now);
  } catch (e) {
    // frame ainda não pronto; ignora e tenta no próximo tick
  }

  const w = canvas.width;
  const h = canvas.height;
  const hands = classifyHands(handResult);

  const leftCount = hands.left ? pushHistory("left", countExtendedFingers(hands.left)) : null;
  const rightCount = hands.right ? pushHistory("right", countExtendedFingers(hands.right)) : null;

  computeWindowPolygon(hands, leftCount ?? -1, w, h, now);
  const blinkFired = detectBlink(faceResult, now);
  resolveFilter(hands, rightCount ?? -1, now, blinkFired);

  drawFrame();
  updateHud();

  state.rafId = requestAnimationFrame(renderLoop);
}

// ---------- inicialização de modelos ----------

async function createHandLandmarker(HandLandmarker, vision) {
  const opts = {
    baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
  try {
    return await HandLandmarker.createFromOptions(vision, opts);
  } catch (e) {
    opts.baseOptions.delegate = "CPU";
    return await HandLandmarker.createFromOptions(vision, opts);
  }
}

async function createFaceLandmarker(FaceLandmarker, vision) {
  const opts = {
    baseOptions: { modelAssetPath: FACE_MODEL_URL, delegate: "GPU" },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: true,
  };
  try {
    return await FaceLandmarker.createFromOptions(vision, opts);
  } catch (e) {
    opts.baseOptions.delegate = "CPU";
    return await FaceLandmarker.createFromOptions(vision, opts);
  }
}

async function initModels() {
  showLoading(true);
  const { FilesetResolver, HandLandmarker, FaceLandmarker } = await import(VISION_BUNDLE_URL);
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  const [handLandmarker, faceLandmarker] = await Promise.all([
    createHandLandmarker(HandLandmarker, vision),
    createFaceLandmarker(FaceLandmarker, vision),
  ]);
  state.handLandmarker = handLandmarker;
  state.faceLandmarker = faceLandmarker;
  showLoading(false);
}

// ---------- câmera ----------

function attachStream(stream) {
  return new Promise((resolve) => {
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.play();
      resolve();
    };
  });
}

async function requestCameraStream(facingMode) {
  const constraints = {
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  };
  return navigator.mediaDevices.getUserMedia(constraints);
}

function stopCurrentStream() {
  if (state.stream) {
    for (const track of state.stream.getTracks()) track.stop();
    state.stream = null;
  }
}

async function checkMultipleCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((d) => d.kind === "videoinput");
    toggleCameraBtn.hidden = videoInputs.length < 2;
  } catch (e) {
    toggleCameraBtn.hidden = true;
  }
}

async function startCamera() {
  try {
    const stream = await requestCameraStream(state.facingMode);
    state.stream = stream;
    await attachStream(stream);
    await checkMultipleCameras();
    hideError();
    hud.hidden = false;
    state.running = true;
    state.rafId = requestAnimationFrame(renderLoop);
  } catch (e) {
    showError(cameraErrorMessage(e));
  }
}

async function switchCamera() {
  state.facingMode = state.facingMode === "user" ? "environment" : "user";
  stopCurrentStream();
  try {
    const stream = await requestCameraStream(state.facingMode);
    state.stream = stream;
    await attachStream(stream);
    hideError();
  } catch (e) {
    showError(cameraErrorMessage(e));
  }
}

function cameraErrorMessage(e) {
  if (e && e.name === "NotAllowedError") {
    return "Permissão de câmera negada. Habilite o acesso à câmera nas configurações do navegador.";
  }
  if (e && e.name === "NotFoundError") {
    return "Nenhuma câmera encontrada neste dispositivo.";
  }
  if (e && e.name === "OverconstrainedError") {
    return "Não foi possível atender às configurações de câmera solicitadas.";
  }
  return "Não foi possível acessar a câmera ou carregar os modelos. Tente novamente.";
}

// ---------- UI helpers ----------

function showLoading(visible) {
  loadingIndicator.hidden = !visible;
}

function showError(message) {
  errorBanner.textContent = message;
  errorBanner.hidden = false;
  state.running = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
}

function hideError() {
  errorBanner.hidden = true;
}

// ---------- ciclo de visibilidade ----------

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    state.running = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
  } else if (state.stream && !state.running) {
    state.running = true;
    state.rafId = requestAnimationFrame(renderLoop);
  }
});

// ---------- eventos ----------

startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  try {
    if (!state.handLandmarker || !state.faceLandmarker) {
      await initModels();
    }
    await startCamera();
    startBtn.hidden = true;
  } catch (e) {
    showError(cameraErrorMessage(e));
  } finally {
    showLoading(false);
    startBtn.disabled = false;
  }
});

toggleCameraBtn.addEventListener("click", () => {
  switchCamera();
});
