import { cStatus, outputPreview, createBtn, autoLoadToggle, loadSessionBtn, clearCacheBtn,
  devOverride, ovMaxLayers, ovMaxNodes, vehicleKind, carImageScale, carImageAngle, cCustomDeg, cCustomLen, cMirrorAdd, cMirrorAll, cColorSel, colorSwatch, nnPresetOutBias } from './dom.js';
import { fmt, setCStatus, debounce } from './utils.js';
import { getCaps, applyOverrideUI } from './caps.js';
import { collectState, applyState, saveState, loadState, clearState, saveLastOutput, loadLastOutput, getLS, STORAGE_KEY, OUTPUT_KEY, AUTOLOAD_KEY } from './storage.js';
import { createCustomRays, renderRaysList, renderRaysSvg, wireSensorButtons } from './sensors.js';
import { nn, wireHiddenButtons, renderHiddenList, renderNNSvg, renderSummary, getOutputCount, buildZeroWeightsAndBiases, buildXavierWeightsAndBiases, countConnections } from './nn.js';

function buildSensors(){
  const rays = createCustomRays.map(r => ({ "$type":"raycast", "Length": r.Length, "Degrees": r.Degrees }));
  const extras = []; document.querySelectorAll('.c-extra').forEach(cb => { if (cb.checked) extras.push({ "$type": cb.value }); });
  return [...rays, ...extras];
}

function renderAll(){
  renderHiddenList(renderAll);
  renderRaysList(renderAll);
  renderRaysSvg();
  const sensors = buildSensors();
  renderSummary(sensors.length);
  renderNNSvg();
}

function sensorsChanged(){ renderAll(); }

(function initPalette(){
  const PALETTE = [
    { name: 'White',  hex: '#FFFFFF' },
    { name: 'Blue',   hex: '#3B82F6' },
    { name: 'Red',    hex: '#EF4444' },
    { name: 'Green',  hex: '#10B981' },
    { name: 'Yellow', hex: '#F59E0B' },
    { name: 'Purple', hex: '#8B5CF6' },
    { name: 'Cyan',   hex: '#06B6D4' },
    { name: 'Magenta',hex: '#DB2777' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Gray',   hex: '#9CA3AF' }
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
carImageScale?.addEventListener('input', sensorsChanged);
carImageAngle?.addEventListener('input', sensorsChanged);

wireSensorButtons(sensorsChanged);

wireHiddenButtons(renderAll);
import { wireNNToggles } from './nn.js';
wireNNToggles(() => { renderAll(); });

document.querySelectorAll('.c-extra').forEach(cb => {
  cb.addEventListener('change', sensorsChanged);
});

nnPresetOutBias?.addEventListener('change', sensorsChanged);

const debouncedSave = debounce(() => saveState(collectState({
  nn,
  flags: {
    nnOutput3: document.getElementById('nnOutput3'),
    nnOutput4: document.getElementById('nnOutput4'),
    nnXavierInit: document.getElementById('nnXavierInit'),
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
  document.getElementById('nnOutput3'), document.getElementById('nnOutput4'), document.getElementById('nnXavierInit'),
  document.getElementById('nnPresetOutBias') 
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
  } catch (e) {  }
});

const api = {
  get flags(){ return {
    nnOutput3: document.getElementById('nnOutput3'),
    nnOutput4: document.getElementById('nnOutput4'),
    nnXavierInit: document.getElementById('nnXavierInit'),
    nnPresetOutBias: document.getElementById('nnPresetOutBias'),
    devOverride: document.getElementById('devOverride'),
    ovMaxLayers: document.getElementById('ovMaxLayers'),
    ovMaxNodes:  document.getElementById('ovMaxNodes'),
  }},
  nn, rays: createCustomRays,
  pushRay: (d,l)=>{ const r = {Degrees:d, Length:l}; if (!isNaN(d)&&!isNaN(l)) createCustomRays.push({id: Date.now()+Math.random(), ...r}); },
  applyOverrideUI,
  get raySortMode(){ return 'angle'; },
  set raySortMode(_){  },
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
  if (document.getElementById('nnXavierInit')?.checked) {
    ({ weights, biases } = buildXavierWeightsAndBiases(shape));
  } else {
    ({ weights, biases } = buildZeroWeightsAndBiases(shape));
  }

  if (document.getElementById('nnPresetOutBias')?.checked) {
    const preset = [0, 0.1, -0.1, -0.1];
    const outCount = shape[shape.length - 1];
    const b = [];
    for (let i = 0; i < outCount; i++) b[i] = (i < preset.length) ? preset[i] : 0;
    biases[biases.length - 1] = b;
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