import { cStatus, outputPreview, createBtn, autoLoadToggle, loadSessionBtn, clearCacheBtn,
  devOverride, ovMaxLayers, ovMaxNodes, vehicleKind, carImageScale, carImageAngle, cCustomDeg, cCustomLen, cMirrorAdd, cMirrorAll, cColorSel, colorSwatch,
  nnXavierWeights, nnXavierBiases, nnPresetOutBias
} from './dom.js';
import { fmt, setCStatus, debounce } from './utils.js';
import { getCaps, applyOverrideUI } from './caps.js';
import { collectState, applyState, saveState, loadState, clearState, saveLastOutput, loadLastOutput, getLS, AUTOLOAD_KEY } from './storage.js';
import { createCustomRays, renderRaysList, renderRaysSvg, wireSensorButtons } from './sensors.js';
import { nn, wireHiddenButtons, renderHiddenList, renderNNSvg, renderSummary, getOutputCount, buildZeroWeightsAndBiases, buildXavierWeightsAndBiases, countConnections } from './nn.js';

const EXTRAS_META = {
  accelerationFront: { label: 'MaxAcceleration', default: 10, min: 0, step: 1 },
  accelerationSide:  { label: 'MaxAcceleration', default: 12, min: 0, step: 1 },
  distanceFromWall:  { label: 'MaxDistance',     default: 150, min: 0, step: 1 },
  grip: null
};

function extraInputId(type, key){ return `extra_${type}_${key}`; }

function ensureExtraControls(){
  document.querySelectorAll('.c-extra').forEach(cb => {
    const type = cb.value;
    const meta = EXTRAS_META[type];
    if (!meta) return; 

    const key = meta.label;
    const id  = extraInputId(type, key);
    if (cb.closest('label')?.querySelector(`#${id}`)) return; 

    const wrap = document.createElement('span');
    wrap.style.marginLeft = '6px';
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '4px';

    const lab = document.createElement('span');
    lab.className = 'hint';
    lab.textContent = `${key}:`;

    const inp = document.createElement('input');
    inp.type = 'number';
    inp.id = id;
    inp.className = 'btn in mini';  
    inp.style.width = '60px';
    inp.step = String(meta.step ?? 1);
    if (Number.isFinite(meta.min)) inp.min = String(meta.min);
    inp.value = String(meta.default);

    const syncDisabled = () => { inp.disabled = !cb.checked; };
    syncDisabled(); 
    cb.addEventListener('change', () => { syncDisabled(); sensorsChanged(); });
    inp.addEventListener('input', () => sensorsChanged());

    wrap.appendChild(lab);
    wrap.appendChild(inp);
    (cb.closest('label') || cb.parentElement)?.appendChild(wrap);
  });
}

function readExtraParam(type){
  const meta = EXTRAS_META[type];
  if (!meta) return null;
  const id = extraInputId(type, meta.label);
  const el = document.getElementById(id);
  let v = Number(el?.value);
  if (!Number.isFinite(v)) v = Number(meta.default);
  if (Number.isFinite(meta.min)) v = Math.max(meta.min, v);
  return { [meta.label]: v };
}

function buildSensors(){
  const rays = createCustomRays.map(r => ({
    "$type":"raycast",
    "Length": r.Length,
    "Degrees": r.Degrees
  }));

  const extras = [];
  document.querySelectorAll('.c-extra').forEach(cb => {
    if (!cb.checked) return;
    const type = cb.value;

    if (type === 'grip') {
      extras.push({ "$type":"grip", "PositionOffset": {} });
      return;
    }

    const meta = EXTRAS_META[type];
    if (meta) {
      const params = readExtraParam(type) || {};
      extras.push({ "$type": type, ...params });
    } else {
      extras.push({ "$type": type });
    }
  });

  return [...rays, ...extras];
}

function renderAll(){
  renderHiddenList(renderAll);
  renderRaysList(renderAll);
  renderRaysSvg();
  ensureExtraControls(); 
  const sensors = buildSensors();
  renderSummary(sensors.length);
  renderNNSvg();
}

function sensorsChanged(){ renderAll(); }

(function initPalette(){
  const PALETTE = [
    { name: 'White',  hex: '#FFFFFF' }, { name: 'Blue',   hex: '#3B82F6' },
    { name: 'Red',    hex: '#EF4444' }, { name: 'Green',  hex: '#10B981' },
    { name: 'Yellow', hex: '#F59E0B' }, { name: 'Purple', hex: '#8B5CF6' },
    { name: 'Cyan',   hex: '#06B6D4' }, { name: 'Magenta',hex: '#DB2777' },
    { name: 'Orange', hex: '#F97316' }, { name: 'Gray',   hex: '#9CA3AF' }
  ];
  if (cColorSel) {
    cColorSel.innerHTML = PALETTE.map((c, i) => `<option value="${i}">${c.name}</option>`).join('');
    cColorSel.value = "3";
    const updateSwatch = () => { colorSwatch && (colorSwatch.style.background = PALETTE[Number(cColorSel.value)].hex); };
    cColorSel.addEventListener('change', updateSwatch);
    updateSwatch();
  }
})();

devOverride?.addEventListener('change', () => { applyOverrideUI(); sensorsChanged(); });
ovMaxLayers?.addEventListener('input', () => sensorsChanged());
ovMaxNodes?.addEventListener('input', () => sensorsChanged());
applyOverrideUI();

vehicleKind?.addEventListener('change', sensorsChanged);
carImageScale?.addEventListener('input', () => sensorsChanged());
carImageAngle?.addEventListener('input', () => sensorsChanged());

wireSensorButtons(sensorsChanged);

wireHiddenButtons(renderAll);
import { wireNNToggles } from './nn.js';
wireNNToggles(() => { renderAll(); });

document.querySelectorAll('.c-extra').forEach(cb => cb.addEventListener('change', sensorsChanged));

const debouncedSave = debounce(() => saveState(collectState({
  nn,
  flags: {
    nnOutput3: document.getElementById('nnOutput3'),
    nnOutput4: document.getElementById('nnOutput4'),
    nnXavierWeights: document.getElementById('nnXavierWeights'),
    nnXavierBiases:  document.getElementById('nnXavierBiases'),
    nnPresetOutBias: document.getElementById('nnPresetOutBias'),
    devOverride: document.getElementById('devOverride'),
    ovMaxLayers: document.getElementById('ovMaxLayers'),
    ovMaxNodes:  document.getElementById('ovMaxNodes')
  },
  rays: createCustomRays,
  raySortMode: 'angle'
})), 300);

[
  devOverride, ovMaxLayers, ovMaxNodes,
  vehicleKind, carImageScale, carImageAngle, cCustomDeg, cCustomLen, cMirrorAdd, cMirrorAll,
  document.getElementById('nnOutput3'), document.getElementById('nnOutput4'),
  document.getElementById('nnXavierWeights'), document.getElementById('nnXavierBiases'), document.getElementById('nnPresetOutBias')
].forEach(el => el && el.addEventListener(
  (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input',
  () => debouncedSave()
));

loadSessionBtn?.addEventListener('click', () => {
  const s = loadState();
  if (s) { applyState(s, api); setCStatus(cStatus, 'Loaded last session'); }
  else   { setCStatus(cStatus, 'No saved session found'); }
});

clearCacheBtn?.addEventListener('click', () => { clearState(); setCStatus(cStatus, 'Cleared saved inputs'); });

createBtn?.addEventListener('click', () => {
  try {
    const created = createFromScratch();
    if (outputPreview) { outputPreview.style.display = ''; outputPreview.textContent = fmt(created); }
    saveLastOutput(created);
    setCStatus(cStatus, 'Created object', 'ok');
    triggerDownload('new_ai', created);
  } catch (e) {}
});

const api = {
  get flags(){ return {
    nnOutput3: document.getElementById('nnOutput3'),
    nnOutput4: document.getElementById('nnOutput4'),
    nnXavierWeights: document.getElementById('nnXavierWeights'),
    nnXavierBiases:  document.getElementById('nnXavierBiases'),
    nnPresetOutBias: document.getElementById('nnPresetOutBias'),
    devOverride: document.getElementById('devOverride'),
    ovMaxLayers: document.getElementById('ovMaxLayers'),
    ovMaxNodes:  document.getElementById('ovMaxNodes'),
  }},
  nn, rays: createCustomRays,
  pushRay: (d,l)=>{ const r = {Degrees:d, Length:l}; if (!isNaN(d)&&!isNaN(l)) createCustomRays.push({id: Date.now()+Math.random(), ...r}); },
  applyOverrideUI,
  get raySortMode(){ return 'angle'; },
  set raySortMode(_){},
  renderAll
};

function triggerDownload(name, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = name + '.evolution';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function createFromScratch(){
  const caps = getCaps();
  const sensors = buildSensors();
  const inputCount = sensors.length;

  if (inputCount > caps.IN_MAX) {
    setCStatus(cStatus, `Cannot create: input sensors (${inputCount}) exceed limit (${caps.IN_MAX}). Reduce sensors.`, 'danger');
    throw new Error('input too large');
  }
  if (nn.layers.length > caps.LAYERS_MAX) {
    setCStatus(cStatus, `Cannot create: total layers must be ≤ ${caps.LAYERS_MAX}.`, 'danger');
    throw new Error('too many layers');
  }

  const out = getOutputCount();
  const shape = [...nn.layers.slice(0, -1), out];
  nn.layers[nn.layers.length - 1] = out;

  let weights, biases;
  const useW = !!nnXavierWeights?.checked;
  const useB = !!nnXavierBiases?.checked;
  if (useW || useB) {
    const zero = buildZeroWeightsAndBiases(shape);
    const x    = buildXavierWeightsAndBiases(shape);
    weights = useW ? x.weights : zero.weights;
    biases  = useB ? x.biases  : zero.biases;
  } else {
    ({ weights, biases } = buildZeroWeightsAndBiases(shape));
  }

  if (nnPresetOutBias?.checked) {
    biases[biases.length - 1] = getPresetOutBiasVector(out);
  }

  let outputs = [0, 1];
  if (document.getElementById('nnOutput4')?.checked) outputs.push(3);
  if (document.getElementById('nnOutput3')?.checked) outputs.push(2);

  const obj = {
    Id: (crypto.randomUUID ? crypto.randomUUID() : 'new-ai'),
    Stats: { Generations: [] },
    NeuralNetwork: {
      Shape: shape,
      InputShape: shape[0],
      OutputShape: out,
      NeuronsCount: shape.reduce((a,b)=>a+b,0),
      ConnectionsCount: countConnections(shape),
      Weights: weights,
      Biases:  biases
    },
    Sensors: sensors,
    Color: Number(cColorSel?.value ?? 3),
    Type: ({formula:0,rally:1,snowmobile:2,truck:3})[vehicleKind?.value] ?? 0,
    IsUserEditable: true,
    StarsToUnlock: 0,
    Snapshots: [],
    Outputs: outputs
  };
  return obj;
}

function getPresetOutBiasVector(outCount){
  const preset = [0, 0.1, -0.1, -0.1];
  const v = new Array(outCount);
  for (let i = 0; i < outCount; i++) v[i] = (i < preset.length) ? preset[i] : 0;
  return v;
}

(function boot(){
  const last = loadLastOutput();
  if (last && outputPreview) { outputPreview.style.display = ''; outputPreview.textContent = fmt(last); }

  const LS = getLS();
  if (autoLoadToggle && LS) {
    autoLoadToggle.checked = LS.getItem(AUTOLOAD_KEY) === '1';
    autoLoadToggle.addEventListener('change', () => {
      LS.setItem(AUTOLOAD_KEY, autoLoadToggle.checked ? '1' : '0');
      setCStatus(cStatus, `Auto-load ${autoLoadToggle.checked ? 'enabled' : 'disabled'}`);
    });
    if (autoLoadToggle.checked) {
      const s = loadState();
      if (s) { applyState(s, api); setCStatus(cStatus, 'Auto-loaded last session'); }
    }
  }

  if (document.getElementById('cCustomDeg') && !document.getElementById('cCustomDeg').value) document.getElementById('cCustomDeg').value = '0';
  if (document.getElementById('cCustomLen') && !document.getElementById('cCustomLen').value) document.getElementById('cCustomLen').value = '900';

  renderAll();
})();