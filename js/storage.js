import { cExtras, vehicleKind, carImageScale, carImageAngle, cColorSel,
  cCustomDeg, cCustomLen } from './dom.js';

let LS = null;
(function(){
  try { const t='__test__'; localStorage.setItem(t,'1'); localStorage.removeItem(t); LS = localStorage; }
  catch { LS = null; }
})();

export const STORAGE_KEY  = 'evoCreator:v1';
export const OUTPUT_KEY   = 'evoCreator:lastOutput';
export const AUTOLOAD_KEY = 'evoCreator:autoLoad';

export function saveState(obj){
  if (LS) { try { LS.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch{} }
}
export function loadState(){
  if (!LS) return null;
  try { return JSON.parse(LS.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}
export function clearState(){
  if (LS) LS.removeItem(STORAGE_KEY);
}

export function saveLastOutput(obj){
  if (LS) { try { LS.setItem(OUTPUT_KEY, JSON.stringify(obj)); } catch{} }
}
export function loadLastOutput(){
  if (!LS) return null;
  try { return JSON.parse(LS.getItem(OUTPUT_KEY) || 'null'); } catch { return null; }
}
export function getLS(){ return LS; }

function getExtraParamKey(type){
  if (type === 'accelerationFront') return 'MaxAcceleration';
  if (type === 'accelerationSide')  return 'MaxAcceleration';
  if (type === 'distanceFromWall')  return 'MaxDistance';
  return null;
}

function extraInputId(type, key){ return `extra_${type}_${key}`; }

function collectExtrasWithParams(){
  const out = [];
  cExtras().forEach(cb => {
    if (!cb.checked) return;
    const type = cb.value;
    const key  = getExtraParamKey(type);
    if (!key){ 
      out.push({ type, params: null });
      return;
    }
    const el = document.getElementById(extraInputId(type, key));
    const val = Number(el?.value);
    out.push({
      type,
      params: { [key]: Number.isFinite(val) ? val : undefined }
    });
  });
  return out;
}

export function collectState(state){
  return {
    nnLayers: [...state.nn.layers],
    nnOutput3: !!state.flags.nnOutput3?.checked,
    nnOutput4: !!state.flags.nnOutput4?.checked,
    nnXavierWeights: !!state.flags.nnXavierWeights?.checked, 
    nnXavierBiases:  !!state.flags.nnXavierBiases?.checked,  
    nnPresetOutBias: !!state.flags.nnPresetOutBias?.checked, 
    devOverride: !!state.flags.devOverride?.checked,
    ovMaxLayers: Number(state.flags.ovMaxLayers?.value || 20),
    ovMaxNodes:  Number(state.flags.ovMaxNodes?.value  || 64),

    rays: state.rays.map(r => ({ Degrees: r.Degrees, Length: r.Length })),

    extrasDetailed: collectExtrasWithParams(),

    extras: cExtras().filter(cb => cb.checked).map(cb => cb.value),

    vehicleKind:   vehicleKind?.value ?? 'formula',
    carImageScale: Number(carImageScale?.value || 1),
    carImageAngle: Number(carImageAngle?.value || 0),
    colorSel:      cColorSel?.value ?? '3',
    cCustomDeg: cCustomDeg?.value ?? '0',
    cCustomLen: cCustomLen?.value ?? '900',
    raySortMode: state.raySortMode
  };
}

export function applyState(s, api){
  if (!s) return;

  if (api.flags.devOverride) api.flags.devOverride.checked = !!s.devOverride;
  if (api.flags.ovMaxLayers && Number.isFinite(s.ovMaxLayers)) api.flags.ovMaxLayers.value = s.ovMaxLayers;
  if (api.flags.ovMaxNodes  && Number.isFinite(s.ovMaxNodes))  api.flags.ovMaxNodes.value  = s.ovMaxNodes;
  api.applyOverrideUI?.();

  if (Array.isArray(s.nnLayers) && s.nnLayers.length >= 2) api.nn.layers = [...s.nnLayers];
  if (api.flags.nnOutput3) api.flags.nnOutput3.checked = !!s.nnOutput3;
  if (api.flags.nnOutput4) api.flags.nnOutput4.checked = !!s.nnOutput4;
  if (api.flags.nnXavierWeights) api.flags.nnXavierWeights.checked = !!s.nnXavierWeights;
  if (api.flags.nnXavierBiases)  api.flags.nnXavierBiases.checked  = !!s.nnXavierBiases;
  if (api.flags.nnPresetOutBias) api.flags.nnPresetOutBias.checked = !!s.nnPresetOutBias;

  api.rays.length = 0;
  if (Array.isArray(s.rays)) s.rays.forEach(r => { api.pushRay(r.Degrees, r.Length); });

  const detailed = Array.isArray(s.extrasDetailed) ? s.extrasDetailed : [];
  const legacySet = new Set(s.extras || []);
  const toCheck = detailed.length ? new Set(detailed.map(e => e.type)) : legacySet;

  cExtras().forEach(cb => { cb.checked = toCheck.has(cb.value); });

  api.renderAll?.();

  if (detailed.length){
    detailed.forEach(e => {
      if (!e?.params) return;               
      const key = Object.keys(e.params)[0];  
      const val = e.params[key];
      if (!Number.isFinite(val)) return;
      const el = document.getElementById(extraInputId(e.type, key));
      if (el) el.value = String(val);
    });
  }

  api.renderAll?.();

  if (vehicleKind && s.vehicleKind) vehicleKind.value = s.vehicleKind;
  if (carImageScale && Number.isFinite(s.carImageScale)) carImageScale.value = s.carImageScale;
  if (carImageAngle && Number.isFinite(s.carImageAngle)) carImageAngle.value = s.carImageAngle;
  if (cColorSel && s.colorSel) cColorSel.value = s.colorSel;

  if (cCustomDeg && s.cCustomDeg != null) cCustomDeg.value = s.cCustomDeg;
  if (cCustomLen && s.cCustomLen != null) cCustomLen.value = s.cCustomLen;

  api.raySortMode = (s.raySortMode === 'added' || s.raySortMode === 'angle') ? s.raySortMode : 'angle';
}