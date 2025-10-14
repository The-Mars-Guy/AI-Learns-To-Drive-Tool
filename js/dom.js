export const el = (id) => document.getElementById(id);

export const cStatus        = el('cStatus');    
export const outputPreview  = el('outputPreview');
export const createBtn      = el('createBtn');
export const autoLoadToggle = el('autoLoadToggle');
export const loadSessionBtn = el('loadSessionBtn');
export const clearCacheBtn  = el('clearCacheBtn');

export const devOverride = el('devOverride');
export const devForm     = el('devForm');
export const ovMaxLayers = el('ovMaxLayers');
export const ovMaxNodes  = el('ovMaxNodes');

export const cCustomDeg   = el('cCustomDeg');
export const cCustomLen   = el('cCustomLen');
export const cAddRay      = el('cAddRay');
export const cClearRays   = el('cClearRays');
export const cMirrorAdd   = el('cMirrorAdd');
export const cMirrorAll   = el('cMirrorAll');
export const cCustomList  = el('cCustomList');
export const rayCountBadge= el('rayCountBadge');
export const raysSvg      = el('raysSvg');
export const vehicleKind  = el('vehicleKind');
export const carImageScale= el('carImageScale');
export const carImageAngle= el('carImageAngle');

export const cColorSel    = el('cColor');
export const colorSwatch  = el('colorSwatch');

export const nnSvg        = el('nnSvg');
export const nnWarn       = el('nnWarn');
export const nnSummary    = el('nnSummary');
export const nnInputAuto  = el('nnInputAuto');
export const nnOutput3    = el('nnOutput3');
export const nnOutput4    = el('nnOutput4');
export const nnOutputCount= el('nnOutputCount');
export const hiddenWrap   = el('hiddenLayers');
export const addHidden    = el('addHidden');
export const nnXavierInit = el('nnXavierInit');
export const nnPresetOutBias = el('nnPresetOutBias'); 

export const cExtras = () => Array.from(document.querySelectorAll('.c-extra'));