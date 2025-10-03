(function(){

  const cColorSel = document.getElementById('cColor');
  const colorSwatch = document.getElementById('colorSwatch');

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

  const devOverride = document.getElementById('devOverride');
  const devForm     = document.getElementById('devForm');
  const ovMaxLayers = document.getElementById('ovMaxLayers');
  const ovMaxNodes  = document.getElementById('ovMaxNodes');

  const DEFAULT_CAPS = { IN_MAX: 20, H_MAX: 12, LAYERS_MAX: 8, snapAngles: true };
  const OVERRIDE_CAPS = { IN_MAX: 20, H_MAX: 64, LAYERS_MAX: 20, snapAngles: false };

  const getCaps = () => {
    if (devOverride && devOverride.checked) {
      return {
        IN_MAX: DEFAULT_CAPS.IN_MAX,
        H_MAX: Math.max(1, Number(ovMaxNodes?.value || OVERRIDE_CAPS.H_MAX)),
        LAYERS_MAX: Math.max(3, Number(ovMaxLayers?.value || OVERRIDE_CAPS.LAYERS_MAX)),
        snapAngles: false
      };
    }
    return { ...DEFAULT_CAPS };
  };

  function applyOverrideUI(){
    if (!devForm || !devOverride) return;
    devForm.style.opacity = devOverride.checked ? '1' : '.6';
    devForm.style.pointerEvents = devOverride.checked ? 'auto' : 'none';
    const degInput = document.getElementById('cCustomDeg');
    if (degInput) degInput.step = devOverride.checked ? '1' : '5';
  }
  devOverride?.addEventListener('change', () => { applyOverrideUI(); sensorsChanged(); });
  ovMaxLayers?.addEventListener('input', () => sensorsChanged());
  ovMaxNodes?.addEventListener('input', () => sensorsChanged());
  applyOverrideUI();

  const outputPreview = document.getElementById('outputPreview');
  const cStatus    = document.getElementById('cStatus');
  const createBtn  = document.getElementById('createBtn');

  const autoLoadToggle = document.getElementById('autoLoadToggle');
  const loadSessionBtn = document.getElementById('loadSessionBtn');
  const clearCacheBtn  = document.getElementById('clearCacheBtn');

  const fmt = (o) => { try { return JSON.stringify(o, null, 2); } catch(e){ return String(o); } };
  const setCStatus = (message, level = '') => {
	  if (!cStatus) return;
	  cStatus.textContent = message || '';

	  cStatus.classList.remove('ok', 'warn', 'danger');

	  if (['ok','warn','danger'].includes(level)) {
		cStatus.classList.add(level);
	  }
	};

  const RAY_MAX = 13;
  const createCustomRays = []; 
  let RAY_ID_SEQ = 1;

  const cCustomDeg = document.getElementById('cCustomDeg');
  const cCustomLen = document.getElementById('cCustomLen');
  const cAddRay    = document.getElementById('cAddRay');
  const cClearRays = document.getElementById('cClearRays');
  const cMirrorAdd = document.getElementById('cMirrorAdd');
  const cMirrorAll = document.getElementById('cMirrorAll');
  const cCustomList= document.getElementById('cCustomList');
  const rayCountBadge = document.getElementById('rayCountBadge');
  const cExtras    = () => Array.from(document.querySelectorAll('.c-extra'));
  const raysSvg    = document.getElementById('raysSvg');

  let raySortMode = 'angle'; 
  let raySortToggleBtn = null;

  function ensureRaySortToggle(){
    if (raySortToggleBtn || !rayCountBadge) return;
    raySortToggleBtn = document.createElement('button');
    raySortToggleBtn.id = 'raySortToggle';
    raySortToggleBtn.className = 'btn small';
    raySortToggleBtn.style.marginLeft = '6px';
    const updateLabel = () => raySortToggleBtn.textContent = `↕ Sort: ${raySortMode === 'angle' ? 'Angle' : 'Added'}`;
    updateLabel();
    raySortToggleBtn.addEventListener('click', () => {
      raySortMode = (raySortMode === 'angle') ? 'added' : 'angle';
      saveStateDebounced();
      renderRaysList();
    });
    const parent = rayCountBadge.parentElement;
    if (parent) parent.insertBefore(raySortToggleBtn, rayCountBadge.nextSibling);
  }

  function wireExtrasListeners() {
    cExtras().forEach(cb => {
      cb.removeEventListener('change', sensorsChanged);
      cb.addEventListener('change', sensorsChanged);
    });
  }
  wireExtrasListeners();

  const vehicleKind   = document.getElementById('vehicleKind');
  const carImageScale = document.getElementById('carImageScale');
  const carImageAngle = document.getElementById('carImageAngle');

  const VEHICLE_SPRITES = {
    formula:    { src: 'images/formula.png',    w: 90,  h: 190 },
    rally:      { src: 'images/rally.png',      w: 110, h: 200 },
    snowmobile: { src: 'images/snowmobile.png', w: 80,  h: 220 },
    truck:      { src: 'images/truck.png',      w: 100, h: 280 }
  };

  const VEHICLE_TYPES = { formula: 0, rally: 1, snowmobile: 2, truck: 3 };

  vehicleKind?.addEventListener('change', sensorsChanged);
  carImageScale?.addEventListener('input', sensorsChanged);
  carImageAngle?.addEventListener('input', sensorsChanged);

  const nnSvg         = document.getElementById('nnSvg');
  const nnWarn        = document.getElementById('nnWarn');
  const nnSummary     = document.getElementById('nnSummary');
  const nnInputAuto   = document.getElementById('nnInputAuto');
  const nnOutput3     = document.getElementById('nnOutput3');
  const nnOutputCount = document.getElementById('nnOutputCount');
  const hiddenWrap    = document.getElementById('hiddenLayers');
  const addHidden     = document.getElementById('addHidden');

  const nnXavierInit  = document.getElementById('nnXavierInit');

  const getOutputCount = () => (nnOutput3 && nnOutput3.checked ? 3 : 2);

  const nn = { layers: [0, 12, 2] }; 

  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));

  const normDeg = (d) => {
    let x = Math.round(Number(d||0));
    if (getCaps().snapAngles) x = Math.round(x/5)*5;
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    if (x === -180) x = 180;
    return x;
  };

  function hasRay(deg, len){
    const d = normDeg(deg);
    return createCustomRays.some(r => r.Degrees === d && r.Length === len);
  }

  function pushRay(deg, len){
    if (createCustomRays.length >= RAY_MAX) {
      setCStatus(`Ray limit reached (${RAY_MAX}).`);
      return null;
    }
    const d = normDeg(deg);
    const l = Math.max(0, Math.round(Number(len||0)));
    if (!hasRay(d, l)) {
      const ray = { id: RAY_ID_SEQ++, Degrees: d, Length: l };
      createCustomRays.push(ray);
      return ray;
    }
    return null;
  }

  function renderRaysSvg(){
    if (!raysSvg) return;

    const vb = raysSvg.viewBox?.baseVal || { x:0, y:0, width: 1000, height: 420 };
    const W = vb.width  || 1000;
    const H = vb.height || 420;

    const cx = W/2, cy = H/2;
    const baseLen = Math.min(W, H) * 0.48;

    let g = `
      <rect x="0" y="0" width="${W}" height="${H}" fill="transparent"/>
      <g>
        <circle cx="${cx}" cy="${cy}" r="${baseLen}" fill="none" stroke="rgba(255,255,255,0.08)" />
        <line x1="${cx}" y1="${cy-baseLen}" x2="${cx}" y2="${cy+baseLen}" stroke="rgba(255,255,255,0.08)"/>
        <line x1="${cx-baseLen}" y1="${cy}" x2="${cx+baseLen}" y2="${cy}" stroke="rgba(255,255,255,0.08)"/>
        <text x="${cx}" y="${cy-baseLen-6}" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.6)">0°</text>
        <text x="${cx+baseLen+6}" y="${cy+4}" text-anchor="start" font-size="11" fill="rgba(255,255,255,0.6)">+90°</text>
        <text x="${cx}" y="${cy+baseLen+14}" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.6)">±180°</text>
        <text x="${cx-baseLen-6}" y="${cy+4}" text-anchor="end" font-size="11" fill="rgba(255,255,255,0.6)">−90°</text>
      </g>
    `;

    const kind  = (vehicleKind?.value || 'formula');
    const angle = Number(carImageAngle?.value || 0);
    const theScale = Number(carImageScale?.value || 1);
    const scale = Math.max(0.2, Math.min(3, theScale));

    const sprite = VEHICLE_SPRITES[kind];
    if (sprite) {
      const imgW = sprite.w * scale;
      const imgH = sprite.h * scale;
      const x = cx - imgW/2, y = cy - imgH/2;
      g += `
        <g transform="rotate(${angle} ${cx} ${cy})">
          <image href="${sprite.src}" x="${x}" y="${y}" width="${imgW}" height="${imgH}"
                preserveAspectRatio="xMidYMid meet" opacity="0.98"></image>
        </g>
      `;
    }

    createCustomRays.forEach((r) => {
      const theta = (r.Degrees) * Math.PI / 180; 
      const scl = Math.max(0, Math.min(1.2, (r.Length || 0) / 900));
      const L = baseLen * (0.6 + 0.4 * scl);
      const x2 = cx + Math.sin(theta) * L;
      const y2 = cy - Math.cos(theta) * L;
      g += `
        <line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="rgba(106,166,255,.9)" stroke-width="2"/>
        <circle cx="${x2}" cy="${y2}" r="3.2" fill="#6aa6ff"/>
      `;
    });

    raysSvg.innerHTML = g;
  }

  function sortedView(){
    if (raySortMode === 'added') return createCustomRays.slice(); 

    return createCustomRays.slice().sort((a,b)=>a.Degrees-b.Degrees || a.Length-b.Length);
  }

  function renderRaysList(){
    ensureRaySortToggle();
    if (!cCustomList) return;
    if (createCustomRays.length === 0){
      cCustomList.innerHTML = `<div class="hint">No rays yet. Add with angle (−180…180) and length.</div>`;
    } else {
      const view = sortedView();
      cCustomList.innerHTML = view.map((r, idx) => `
        <div class="row tight between">
          <span class="pill">#${idx+1} → deg: <strong>${r.Degrees}</strong>, len: <strong>${r.Length}</strong></span>
          <div class="row tight">
            <button class="btn small" data-act="edit" data-id="${r.id}">Edit</button>
            <button class="btn small" data-act="del"  data-id="${r.id}">Remove</button>
          </div>
        </div>
      `).join('');
      cCustomList.querySelectorAll('button[data-act]').forEach(btn => {
        const act = btn.getAttribute('data-act');
        const id  = Number(btn.getAttribute('data-id'));
        btn.addEventListener('click', () => {
          const idx = createCustomRays.findIndex(r => r.id === id);
          if (idx === -1) return; 
          if (act === 'del') {
            createCustomRays.splice(idx, 1);
          } else if (act === 'edit') {
            const caps = getCaps();
            const r = createCustomRays[idx];
            let nd = prompt(`Degrees (−180…180${caps.snapAngles ? ', 5° steps' : ''}):`, r.Degrees);
            if (nd === null) return;
            let nl = prompt('Length (≥0):', r.Length);
            if (nl === null) return;
            const d = normDeg(Number(nd));
            const l = Math.max(0, Math.round(Number(nl)));
            createCustomRays[idx] = { ...r, Degrees: d, Length: l }; 
          }
          sensorsChanged();
        });
      });
    }
    if (rayCountBadge) rayCountBadge.textContent = `${createCustomRays.length} ray${createCustomRays.length===1?'':'s'}`;
  }

  cAddRay?.addEventListener('click', () => {
    const d = Number(cCustomDeg?.value || 0);
    const l = Number(cCustomLen?.value || 900);
    const added = pushRay(d, l);
    if (added && cMirrorAdd?.checked) {
      const m = normDeg(-added.Degrees);
      if (!(added.Degrees === 0 || Math.abs(added.Degrees) === 180)) {
        pushRay(m, l);
      }
    }
    sensorsChanged();
  });

  cClearRays?.addEventListener('click', () => { createCustomRays.length = 0; sensorsChanged(); });

  cMirrorAll?.addEventListener('click', () => {
    const snapshot = createCustomRays.slice();
    for (const r of snapshot) {
      if (createCustomRays.length >= RAY_MAX) break;
      const m = normDeg(-r.Degrees);
      if (!(r.Degrees === 0 || Math.abs(r.Degrees) === 180)) {
        pushRay(m, r.Length);
      }
    }
    sensorsChanged();
  });

  function buildSensors(){
    const rays = createCustomRays.map(r => ({ "$type":"raycast", "Length": r.Length, "Degrees": r.Degrees }));
    const extras = []; cExtras().forEach(cb => { if (cb.checked) extras.push({ "$type": cb.value }); });
    return [...rays, ...extras];
  }

  function renderHiddenList(){
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

  function tryAddHidden(){
    const caps = getCaps();
    if (nn.layers.length >= caps.LAYERS_MAX) {
      nnWarn && (nnWarn.style.display = '', nnWarn.textContent = `Max ${caps.LAYERS_MAX} layers reached.`);
      return;
    }
    nn.layers.splice(nn.layers.length - 1, 0, Math.min(getCaps().H_MAX, 12));
    renderAll();
  }
  addHidden?.addEventListener('click', tryAddHidden);

  let previewWeights = null;      
  let previewShape   = null;      

  function shapesEqual(a, b){
    if (!a || !b || a.length !== b.length) return false;
    for (let i=0;i<a.length;i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function ensurePreviewWeights(shape){
    if (!nnXavierInit?.checked) { previewWeights = null; previewShape = null; return; }
    if (previewWeights && shapesEqual(previewShape, shape)) return;
    previewShape = [...shape];
    previewWeights = buildXavierWeightsAndBiases(shape).weights; 
  }

  function renderNNSvg(){
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

      return sign >= 0 ? `rgba(101,245,167,${alpha})`               
                       : `rgba(255,106,106,${alpha})`;              
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
      const fill = li === 0 ? '#6aa6ff' : (li === L-1 ? '#65f5a7' : '#d9d9ff');
      const stroke = 'rgba(255,255,255,0.35)';
      const label = li === 0 ? 'Input' : (li === L-1 ? 'Output' : `Hidden ${li}`);
      nodes += `<text x="${xs[li]}" y="${padY - 6}" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.7)">${label} (${layers[li]})</text>`;
      ys.forEach(y => { nodes += `<circle cx="${xs[li]}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`; });
    }

    nnSvg.innerHTML = `<rect class="nn-raycast" x="0" y="0" width="${W}" height="${H}" fill="transparent"></rect>` + lines + nodes;
  }

  function renderSummary(){
    const caps = getCaps();
    const sensors = buildSensors();
    const inputCount = sensors.length;

    nn.layers[0] = Math.min(caps.IN_MAX, inputCount);
    for (let i = 1; i <= nn.layers.length - 2; i++) {
      nn.layers[i] = clamp(Number(nn.layers[i] || 1), 1, caps.H_MAX);
    }

    const out = getOutputCount();
    nn.layers[nn.layers.length - 1] = out;

    const shape = [...nn.layers];
    const neurons = shape.reduce((a,b)=>a+b,0);

    if (nnInputAuto) nnInputAuto.textContent = String(inputCount);
    if (nnOutputCount) nnOutputCount.textContent = String(out);

    if (nnWarn) {
      if (inputCount > caps.IN_MAX) {
        nnWarn.style.display = '';
        nnWarn.textContent = `Input exceeds limit (${inputCount} > ${caps.IN_MAX}). Reduce sensors.`;
      } else if (nn.layers.length > caps.LAYERS_MAX) {
        nnWarn.style.display = '';
        nnWarn.textContent = `Too many layers (>${caps.LAYERS_MAX}).`;
      } else if (createCustomRays.length > RAY_MAX) {
        nnWarn.style.display = '';
        nnWarn.textContent = `Max ${RAY_MAX} rays allowed.`;
      } else {
        nnWarn.style.display = 'none';
        nnWarn.textContent = '';
      }
    }
    if (nnSummary) nnSummary.textContent = `Shape: [${shape.join(', ')}] • Layers: ${shape.length} • Neurons: ${neurons}`;
  }

  function renderAll(){
    renderHiddenList();
    renderRaysList();
    renderRaysSvg();
    renderSummary();
    renderNNSvg();
  }

  function sensorsChanged(){ renderAll(); }

  nnOutput3?.addEventListener('change', sensorsChanged);

  nnXavierInit?.addEventListener('change', () => { previewWeights = null; previewShape = null; sensorsChanged(); });

  function buildZeroWeightsAndBiases(shape){
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

  function buildXavierWeightsAndBiases(shape){
    const weights = [];
    const biases  = [];
    for (let i = 0; i < shape.length - 1; i++){
      const fanIn  = shape[i];
      const fanOut = shape[i+1];
      const limit  = Math.sqrt(6 / (fanIn + fanOut));
      const mat = Array.from({ length: fanIn }, () =>
        Array.from({ length: fanOut }, () => (Math.random() * 2 - 1) * limit)
      );
      weights.push(mat);
    }
    for (let i = 1; i < shape.length; i++){
      biases.push(Array(shape[i]).fill(0));
    }
    return { weights, biases };
  }

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
    setCStatus(
      `Cannot create: input sensors (${inputCount}) exceed limit (${caps.IN_MAX}). Reduce sensors.`,
      'danger'
    );
    throw new Error('input too large');
  }
  if (nn.layers.length > caps.LAYERS_MAX) {
    setCStatus(
      `Cannot create: total layers must be ≤ ${caps.LAYERS_MAX}.`,
      'danger'
    );
    throw new Error('too many layers');
  }
  if (createCustomRays.length > RAY_MAX) {
    setCStatus(
      `Cannot create: max ${RAY_MAX} rays allowed.`,
      'danger'
    );
    throw new Error('too many rays');
  }

  const out = getOutputCount();
  const shape = [...nn.layers.slice(0, -1), out];
  nn.layers[nn.layers.length - 1] = out;

  let weights, biases;
  if (nnXavierInit?.checked) {
    ({ weights, biases } = buildXavierWeightsAndBiases(shape));
  } else {
    ({ weights, biases } = buildZeroWeightsAndBiases(shape));
  }

  const outputs = out === 3 ? [0, 1, 2] : [0, 1];

  const obj = {
    Id: (crypto.randomUUID ? crypto.randomUUID() : 'new-ai'),
    Stats: { Generations: [] },
    NeuralNetwork: {
      Shape: shape,
      InputShape: shape[0],
      OutputShape: out,
      NeuronsCount: shape.reduce((a,b)=>a+b,0),
      Weights: weights,
      Biases:  biases
    },
    Sensors: sensors,
    Color: Number(cColorSel?.value ?? 3),
    Type: VEHICLE_TYPES[vehicleKind?.value] ?? 0,
    IsUserEditable: true,
    StarsToUnlock: 0,
    Snapshots: [],
    Outputs: outputs
  };
  return obj;
}

  const STORAGE_KEY  = 'evoCreator:v1';          
  const OUTPUT_KEY   = 'evoCreator:lastOutput';  
  const AUTOLOAD_KEY = 'evoCreator:autoLoad';    

  function safeStorage() {
    try { const t='__test__'; localStorage.setItem(t,'1'); localStorage.removeItem(t); return localStorage; }
    catch { return null; }
  }
  const LS = safeStorage();

  function debounce(fn, ms=250) { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
  const saveStateDebounced = debounce(saveState, 300);

  function collectState() {
    return {
      nnLayers: [...nn.layers],
      nnOutput3: !!nnOutput3?.checked,
      nnXavierInit: !!nnXavierInit?.checked,     
      devOverride: !!devOverride?.checked,
      ovMaxLayers: Number(ovMaxLayers?.value || 20),
      ovMaxNodes:  Number(ovMaxNodes?.value  || 64),

      rays: createCustomRays.map(r => ({ Degrees: r.Degrees, Length: r.Length })),
      extras: cExtras().filter(cb => cb.checked).map(cb => cb.value),
      vehicleKind:   vehicleKind?.value ?? 'formula',
      carImageScale: Number(carImageScale?.value || 1),
      carImageAngle: Number(carImageAngle?.value || 0),
      colorSel:      cColorSel?.value ?? '3',
      cCustomDeg: cCustomDeg?.value ?? '0',
      cCustomLen: cCustomLen?.value ?? '900',
      raySortMode: raySortMode
    };
  }
  function applyState(s) {
    if (!s) return;

    if (devOverride) devOverride.checked = !!s.devOverride;
    if (ovMaxLayers && Number.isFinite(s.ovMaxLayers)) ovMaxLayers.value = s.ovMaxLayers;
    if (ovMaxNodes  && Number.isFinite(s.ovMaxNodes))  ovMaxNodes.value  = s.ovMaxNodes;
    applyOverrideUI?.();

    if (Array.isArray(s.nnLayers) && s.nnLayers.length >= 2) nn.layers = [...s.nnLayers];
    if (nnOutput3) nnOutput3.checked = !!s.nnOutput3;
    if (nnXavierInit) nnXavierInit.checked = !!s.nnXavierInit;

    createCustomRays.length = 0;
    if (Array.isArray(s.rays)) s.rays.forEach(r => { pushRay(r.Degrees, r.Length); });

    const S = new Set(s.extras || []);
    cExtras().forEach(cb => cb.checked = S.has(cb.value));

    if (vehicleKind && s.vehicleKind) vehicleKind.value = s.vehicleKind;
    if (carImageScale && Number.isFinite(s.carImageScale)) carImageScale.value = s.carImageScale;
    if (carImageAngle && Number.isFinite(s.carImageAngle)) carImageAngle.value = s.carImageAngle;
    if (cColorSel && s.colorSel) cColorSel.value = s.colorSel;

    if (cCustomDeg && s.cCustomDeg != null) cCustomDeg.value = s.cCustomDeg;
    if (cCustomLen && s.cCustomLen != null) cCustomLen.value = s.cCustomLen;

    raySortMode = (s.raySortMode === 'added' || s.raySortMode === 'angle') ? s.raySortMode : 'angle';

    renderAll();
  }
  function saveState(){ if (LS) LS.setItem(STORAGE_KEY, JSON.stringify(collectState())); }
  function loadState(){ if (!LS) return null; try { return JSON.parse(LS.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }
  function clearState(){ if (LS) LS.removeItem(STORAGE_KEY); }

  function saveLastOutput(obj){ if (LS) { try { LS.setItem(OUTPUT_KEY, JSON.stringify(obj)); } catch{} } }
  function loadLastOutput(){ if (!LS) return null; try { return JSON.parse(LS.getItem(OUTPUT_KEY) || 'null'); } catch { return null; } }

  const _renderAll = renderAll;
  renderAll = function(){ _renderAll(); saveStateDebounced(); };

  [
    devOverride, ovMaxLayers, ovMaxNodes, nnOutput3, nnXavierInit,
    vehicleKind, carImageScale, carImageAngle, cCustomDeg, cCustomLen,
    cMirrorAdd, cMirrorAll
  ].forEach(el => el && el.addEventListener(
    (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input',
    () => saveStateDebounced()
  ));

  loadSessionBtn?.addEventListener('click', () => {
    const s = loadState();
    if (s) { applyState(s); setCStatus('Loaded last session'); }
    else   { setCStatus('No saved session found'); }
  });

  if (autoLoadToggle && LS) {
    autoLoadToggle.checked = LS.getItem(AUTOLOAD_KEY) === '1';
    autoLoadToggle.addEventListener('change', () => {
      LS.setItem(AUTOLOAD_KEY, autoLoadToggle.checked ? '1' : '0');
      setCStatus(`Auto-load ${autoLoadToggle.checked ? 'enabled' : 'disabled'}`);
    });
  }

  clearCacheBtn?.addEventListener('click', () => { clearState(); setCStatus('Cleared saved inputs'); });

  createBtn?.addEventListener('click', () => {
    try {
      const created = createFromScratch();
      if (outputPreview) outputPreview.textContent = fmt(created);
      saveLastOutput(created); 
      setCStatus('Created object');
      triggerDownload('new_ai', created);
    } catch (e) {  }
  });

  (function boot(){

    const last = loadLastOutput();
    if (last && outputPreview) outputPreview.textContent = fmt(last);

    const shouldAutoLoad = LS && LS.getItem(AUTOLOAD_KEY) === '1';
    if (shouldAutoLoad) {
      const s = loadState();
      if (s) { applyState(s); setCStatus('Auto-loaded last session'); return; }
    }

    if (cCustomDeg && !cCustomDeg.value) cCustomDeg.value = '0';
    if (cCustomLen && !cCustomLen.value) cCustomLen.value = '900';

    ensureRaySortToggle();

    renderAll();
  })();

})();
