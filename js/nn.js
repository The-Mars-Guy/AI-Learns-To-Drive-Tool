import { clamp } from './utils.js';
import { getCaps } from './caps.js';
import {
  nnSvg, nnWarn, nnSummary, nnInputAuto, nnOutput3, nnOutput4, nnOutputCount,
  hiddenWrap, addHidden, nnXavierInit, nnPresetOutBias,
} from './dom.js';

export const nn = { layers: [0, 12, 2] };

export const getOutputCount = () => {
  let count = 2;
  if (nnOutput4?.checked) count++;
  if (nnOutput3?.checked) count++;
  return count;
};

export function countConnections(shape){
  let total = 0;
  for (let i = 0; i < shape.length - 1; i++){
    total += (shape[i] * shape[i+1]);
  }
  return total;
}

export function renderHiddenList(renderAll){
  if (!hiddenWrap) return;
  const caps = getCaps();
  const hidden = nn.layers.slice(1, -1);
  if (hidden.length === 0) {
    hiddenWrap.innerHTML = `<div class="hint">No hidden layers. Click <strong>Add hidden layer</strong> (max ${caps.LAYERS_MAX - 2}).</div>`;
    return;
  }
  hiddenWrap.innerHTML = hidden.map((size, i) => {
    const idx = i + 1;
    return `
      <div class="row tight between">
        <div class="row tight">
          <span class="pill">Hidden ${idx}</span>
          <button class="btn small" data-act="dec" data-idx="${idx}">−</button>
          <span class="pill">nodes: <strong>${size}</strong></span>
          <button class="btn small" data-act="inc" data-idx="${idx}">+</button>
        </div>
        <button class="btn small" data-act="del" data-idx="${idx}">Remove</button>
      </div>
    `;
  }).join('');
  hiddenWrap.querySelectorAll('button[data-act]').forEach(btn => {
    const act = btn.getAttribute('data-act');
    const idx = Number(btn.getAttribute('data-idx'));
    btn.addEventListener('click', () => {
      const capsNow = getCaps();
      if (act === 'inc') nn.layers[idx] = Math.min(capsNow.H_MAX, Number(nn.layers[idx]) + 1);
      else if (act === 'dec') nn.layers[idx] = Math.max(1, Number(nn.layers[idx]) - 1);
      else if (act === 'del') nn.layers.splice(idx, 1);
      renderAll();
    });
  });
}

export function tryAddHidden(renderAll){
  const caps = getCaps();
  if (nn.layers.length >= caps.LAYERS_MAX) {
    nnWarn && (nnWarn.style.display = '', nnWarn.textContent = `Max ${caps.LAYERS_MAX} layers reached.`);
    return;
  }
  nn.layers.splice(nn.layers.length - 1, 0, Math.min(getCaps().H_MAX, 12));
  renderAll();
}
export function wireHiddenButtons(renderAll){ addHidden?.addEventListener('click', () => tryAddHidden(renderAll)); }

let previewWeights = null;
let previewShape   = null;

function shapesEqual(a, b){
  if (!a || !b || a.length !== b.length) return false;
  for (let i=0;i<a.length;i++) if (a[i] !== b[i]) return false;
  return true;
}

export function buildZeroWeightsAndBiases(shape){
  const weights = [];
  const biases  = [];
  for (let i = 0; i < shape.length - 1; i++){
    const rows = shape[i];
    const cols = shape[i+1];
    const mat = Array.from({length: rows}, () => Array(cols).fill(0));
    weights.push(mat);
  }
  for (let i = 1; i < shape.length; i++){
    biases.push(Array(shape[i]).fill(0));
  }
  return { weights, biases };
}

export function buildXavierWeightsAndBiases(shape){
  const weights = [];
  const biases  = [];
  for (let i = 0; i < shape.length - 1; i++){
    const fanIn  = shape[i];
    const fanOut = shape[i+1];
    const limit  = Math.sqrt(6 / (fanIn + fanOut));

    const wMat = Array.from({ length: fanIn }, () =>
      Array.from({ length: fanOut }, () => (Math.random() * 2 - 1) * limit)
    );
    weights.push(wMat);

    const bVec = Array.from({ length: fanOut }, () => (Math.random() * 2 - 1) * limit);
    biases.push(bVec);
  }
  return { weights, biases };
}

function ensurePreviewWeights(shape){
  if (!nnXavierInit?.checked) { previewWeights = null; previewShape = null; return; }
  if (previewWeights && shapesEqual(previewShape, shape)) return;
  previewShape = [...shape];
  previewWeights = buildXavierWeightsAndBiases(shape).weights;
}

function getPresetOutBiasVector(outCount){
  const preset = [0, 0.1, -0.1, -0.1];
  const v = new Array(outCount);
  for (let i = 0; i < outCount; i++){
    v[i] = (i < preset.length) ? preset[i] : 0;
  }
  return v;
}

export function renderNNSvg(){
  if (!nnSvg) return;
  const layers = nn.layers;
  const W = 980, H = 380;
  const padX = 60, padY = 28;
  const innerW = W - padX*2;
  const L = layers.length;

  ensurePreviewWeights(layers);

  const xs = Array.from({length: L}, (_, i) => padX + (innerW) * (L === 1 ? 0.5 : i/(L-1)));
  const colYs = (count) => {
    if (count <= 1) return [H/2];
    const top = padY, bottom = H - padY;
    const step = (bottom - top) / (count - 1);
    return Array.from({length: count}, (_, i) => top + i*step);
  };

  const layerMaxAbs = [];
  if (previewWeights) {
    for (let li = 0; li < L - 1; li++) {
      const w = previewWeights[li];
      let m = 0;
      for (let r = 0; r < w.length; r++) for (let c = 0; c < w[0].length; c++) m = Math.max(m, Math.abs(w[r][c]));
      layerMaxAbs[li] = m || 1e-6;
    }
  }
  const weightStroke = (li, ri, ci) => {
    if (!previewWeights) return 'rgba(255,255,255,0.15)';
    const w = previewWeights[li][ri][ci];
    const sign = w >= 0 ? 1 : -1;
    const norm = Math.min(1, Math.abs(w) / layerMaxAbs[li]);
    const alpha = 0.18 + 0.72 * norm;
    return sign >= 0 ? `rgba(101,245,167,${alpha})` : `rgba(255,106,106,${alpha})`;
  };

  let lines = '', nodes = '';
  for (let li = 0; li < L-1; li++) {
    const y1s = colYs(layers[li]);
    const y2s = colYs(layers[li+1]);
    for (let r = 0; r < y1s.length; r++) {
      for (let c = 0; c < y2s.length; c++) {
        const stroke = weightStroke(li, r, c);
        lines += `<line x1="${xs[li]}" y1="${y1s[r]}" x2="${xs[li+1]}" y2="${y2s[c]}" stroke="${stroke}" stroke-width="1"/>`;
      }
    }
  }

  for (let li = 0; li < L; li++) {
    const ys = colYs(layers[li]);
    const r = 9.5;

    let nodeFills;

    if (li === 0) {

      nodeFills = Array.from({ length: layers[li] }, () => '#6aa6ff');
    } else if (li === L - 1 && nnPresetOutBias?.checked) {

      const vb = getPresetOutBiasVector(layers[li]);
      nodeFills = vb.map(v => v > 0 ? '#22c55e' : (v < 0 ? '#ef4444' : '#d1d5db'));
    } else if (nnXavierInit?.checked && previewWeights && li > 0) {

      const W_in = previewWeights[li - 1]; 
      const prevCount = W_in.length || 1;
      nodeFills = Array.from({ length: layers[li] }, (_, j) => {
        let sum = 0;
        for (let i = 0; i < prevCount; i++) sum += (W_in[i][j] || 0);
        const avg = sum / prevCount;
        return avg >= 0 ? '#22c55e' : '#ef4444';
      });
    } else {

      const base = () => (li === L - 1 ? '#65f5a7' : '#d9d9ff');
      nodeFills = Array.from({ length: layers[li] }, () => base());
    }

    const stroke = 'rgba(255,255,255,0.35)';
    const label = li === 0 ? 'Input' : (li === L-1 ? 'Output' : `Hidden ${li}`);
    nodes += `<text x="${xs[li]}" y="${padY - 6}" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.7)">${label} (${layers[li]})</text>`;
    ys.forEach((y, idx) => {
      const fill = nodeFills[idx];
      nodes += `<circle cx="${xs[li]}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
    });
  }

  nnSvg.innerHTML = `<rect class="nn-raycast" x="0" y="0" width="${W}" height="${H}" fill="transparent"></rect>` + lines + nodes;
}

export function renderSummary(sensorsCount){
  const caps = getCaps();
  const inputCount = sensorsCount;

  nn.layers[0] = Math.min(caps.IN_MAX, inputCount);
  for (let i = 1; i <= nn.layers.length - 2; i++) {
    nn.layers[i] = clamp(Number(nn.layers[i] || 1), 1, caps.H_MAX);
  }

  const out = getOutputCount();
  nn.layers[nn.layers.length - 1] = out;

  const shape = [...nn.layers];
  const neurons = shape.reduce((a,b)=>a+b,0);
  const connections = countConnections(shape);

  if (nnInputAuto) nnInputAuto.textContent = String(inputCount);
  if (nnOutputCount) nnOutputCount.textContent = String(out);

  if (nnWarn) {
    if (inputCount > caps.IN_MAX) {
      nnWarn.style.display = '';
      nnWarn.textContent = `Input exceeds limit (${inputCount} > ${caps.IN_MAX}). Reduce sensors.`;
    } else if (nn.layers.length > caps.LAYERS_MAX) {
      nnWarn.style.display = '';
      nnWarn.textContent = `Too many layers (>${caps.LAYERS_MAX}).`;
    } else {
      nnWarn.style.display = 'none';
      nnWarn.textContent = '';
    }
  }
  if (nnSummary) nnSummary.textContent = `Shape: [${shape.join(', ')}] • Layers: ${shape.length} • Neurons: ${neurons} • Connections: ${connections}`;
}

export function wireNNToggles(onChange){
  nnOutput3?.addEventListener('change', onChange);
  nnOutput4?.addEventListener('change', onChange);
  nnXavierInit?.addEventListener('change', onChange);
  nnPresetOutBias?.addEventListener('change', onChange);
}