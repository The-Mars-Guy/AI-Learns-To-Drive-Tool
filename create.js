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
  const fmt = (o) => { try { return JSON.stringify(o, null, 2); } catch(e){ return String(o); } };
  const setCStatus = (m) => { if (cStatus) cStatus.textContent = m || ''; };

  const RAY_MAX = 13;
  const createCustomRays = []; 

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
    formula:    { src: rel('images/formula.png'),    w: 90,  h: 190 },
    rally:      { src: rel('images/rally.png'),      w: 110, h: 200 },
    snowmobile: { src: rel('images/snowmobile.png'), w: 80,  h: 220 },
    truck:      { src: rel('images/truck.png'),      w: 100, h: 280 }
  };

  const VEHICLE_TYPES = {
    formula: 0,
    rally: 1,
    snowmobile: 2,
    truck: 3
  };

  vehicleKind?.addEventListener('change', sensorsChanged);
  carImageScale?.addEventListener('input', sensorsChanged);
  carImageAngle?.addEventListener('input', sensorsChanged);

  const nnSvg      = document.getElementById('nnSvg');
  const nnWarn     = document.getElementById('nnWarn');
  const nnSummary  = document.getElementById('nnSummary');
  const nnInputAuto= document.getElementById('nnInputAuto');
  const hiddenWrap = document.getElementById('hiddenLayers');
  const addHidden  = document.getElementById('addHidden');

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
      createCustomRays.push({ Degrees: d, Length: l });
      return { Degrees: d, Length: l };
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
    const scale = Math.max(0.2, Math.min(3, Number(carImageScale?.value || 1)));

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

  function renderRaysList(){
    if (!cCustomList) return;
    if (createCustomRays.length === 0){
      cCustomList.innerHTML = `<div class="hint">No rays yet. Add with angle (−180→180) and length.</div>`;
    } else {
      cCustomList.innerHTML = createCustomRays
        .slice()
        .sort((a,b)=>a.Degrees-b.Degrees || a.Length-b.Length)
        .map((r, idx) => `
          <div class="row tight between">
            <span class="pill">#${idx+1} → deg: <strong>${r.Degrees}</strong>, len: <strong>${r.Length}</strong></span>
            <div class="row tight">
              <button class="btn small" data-act="edit" data-idx="${idx}">Edit</button>
              <button class="btn small" data-act="del"  data-idx="${idx}">Remove</button>
            </div>
          </div>
        `).join('');
      cCustomList.querySelectorAll('button[data-act]').forEach(btn => {
        const act = btn.getAttribute('data-act');
        const idx = Number(btn.getAttribute('data-idx'));
        btn.addEventListener('click', () => {
          if (idx < 0 || idx >= createCustomRays.length) return;
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
            createCustomRays[idx] = { Degrees: d, Length: l };
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

  function renderNNSvg(){
    if (!nnSvg) return;
    const layers = nn.layers;
    const W = 980, H = 380;
    const padX = 60, padY = 28;
    const innerW = W - padX*2;
    const L = layers.length;

    const xs = Array.from({length: L}, (_, i) => padX + (innerW) * (L === 1 ? 0.5 : i/(L-1)));
    const colYs = (count) => {
      if (count <= 1) return [H/2];
      const top = padY, bottom = H - padY;
      const step = (bottom - top) / (count - 1);
      return Array.from({length: count}, (_, i) => top + i*step);
    };

    let lines = '', nodes = '';
    for (let li = 0; li < L-1; li++) {
      const y1s = colYs(layers[li]);
      const y2s = colYs(layers[li+1]);
      for (let y1 of y1s) for (let y2 of y2s) {
        lines += `<line x1="${xs[li]}" y1="${y1}" x2="${xs[li+1]}" y2="${y2}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>`;
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

    const shape = [nn.layers[0], ...nn.layers.slice(1,-1), 2];
    const neurons = shape.reduce((a,b)=>a+b,0);

    if (nnInputAuto) nnInputAuto.textContent = String(inputCount);
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
      setCStatus(`Cannot create: input sensors (${inputCount}) exceed limit (${caps.IN_MAX}). Reduce sensors.`);
      throw new Error('input too large');
    }
    if (nn.layers.length > caps.LAYERS_MAX) {
      setCStatus(`Cannot create: total layers must be ≤ ${caps.LAYERS_MAX}.`);
      throw new Error('too many layers');
    }
    if (createCustomRays.length > RAY_MAX) {
      setCStatus(`Cannot create: max ${RAY_MAX} rays allowed.`);
      throw new Error('too many rays');
    }

    const shape = [inputCount, ...nn.layers.slice(1,-1), 2];
    const { weights, biases } = buildZeroWeightsAndBiases(shape);

    const obj = {
      Id: (crypto.randomUUID ? crypto.randomUUID() : 'new-ai'),
      Stats: { Generations: [] },
      NeuralNetwork: {
        Shape: shape,
        InputShape: inputCount,
        OutputShape: 2,
        NeuronsCount: shape.reduce((a,b)=>a+b,0),
        Weights: weights,
        Biases:  biases
      },
      Sensors: sensors,
      Color: Number(cColorSel?.value ?? 3),
      Type: VEHICLE_TYPES[vehicleKind?.value] ?? 0,   
      IsUserEditable: true,
      StarsToUnlock: 0,
      Snapshots: []
    };
    return obj;
  }

  createBtn?.addEventListener('click', () => {
    try {
      const created = createFromScratch();
      if (outputPreview) outputPreview.textContent = fmt(created);
      setCStatus('Created object');
      triggerDownload('new_ai', created);
    } catch (e) {  }
  });

  if (cCustomDeg && !cCustomDeg.value) cCustomDeg.value = '0';
  if (cCustomLen && !cCustomLen.value) cCustomLen.value = '900';
  renderAll();
})();

