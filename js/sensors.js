import { getCaps } from './caps.js';
import { cCustomDeg, cCustomLen, cAddRay, cClearRays, cMirrorAdd, cMirrorAll,
  cCustomList, rayCountBadge, raysSvg, vehicleKind, carImageScale, carImageAngle } from './dom.js';

export const VEHICLE_SPRITES = {
  formula:    { src: 'images/formula.png',    w: 90,  h: 190 },
  rally:      { src: 'images/rally.png',      w: 110, h: 200 },
  snowmobile: { src: 'images/snowmobile.png', w: 80,  h: 220 },
  truck:      { src: 'images/truck.png',      w: 100, h: 280 }
};

export const createCustomRays = [];
let RAY_ID_SEQ = 1;

export let raySortMode = 'angle';
let raySortToggleBtn = null;

export const getRaySortMode = () => raySortMode;
export function setRaySortMode(mode){
  if (mode !== 'angle' && mode !== 'added') return;
  raySortMode = mode;
  if (raySortToggleBtn) {
    raySortToggleBtn.textContent = `↕ Sort: ${raySortMode === 'angle' ? 'Angle' : 'Added'}`;
  }
}

export const normDeg = (d) => {
  let x = Math.round(Number(d||0));
  if (getCaps().snapAngles) x = Math.round(x/5)*5;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  if (x === -180) x = 180;
  return x;
};

export function hasRay(deg, len){
  const d = normDeg(deg);
  return createCustomRays.some(r => r.Degrees === d && r.Length === len);
}

export function pushRay(deg, len){
  const caps = getCaps();
  if (createCustomRays.length >= caps.RAY_MAX) {
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

export function sortedView(){
  if (raySortMode === 'added') return createCustomRays.slice();
  return createCustomRays.slice().sort((a,b)=>a.Degrees-b.Degrees || a.Length-b.Length);
}

export function renderRaysList(onChange){
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
          const r = createCustomRays[idx];
          let nd = prompt(`Degrees (−180…180):`, r.Degrees);
          if (nd === null) return;
          let nl = prompt('Length (≥0):', r.Length);
          if (nl === null) return;
          const d = normDeg(Number(nd));
          const l = Math.max(0, Math.round(Number(nl)));
          createCustomRays[idx] = { ...r, Degrees: d, Length: l };
        }
        onChange?.();
      });
    });
  }
  if (rayCountBadge) {
    const caps = getCaps();
    rayCountBadge.textContent = `${createCustomRays.length}/${caps.RAY_MAX} rays`;
  }

  ensureRaySortToggle(onChange);
}

function ensureRaySortToggle(onChange){
  if (raySortToggleBtn || !rayCountBadge) return;
  raySortToggleBtn = document.createElement('button');
  raySortToggleBtn.id = 'raySortToggle';
  raySortToggleBtn.className = 'btn small';
  raySortToggleBtn.style.marginLeft = '6px';
  const updateLabel = () => raySortToggleBtn.textContent = `↕ Sort: ${raySortMode === 'angle' ? 'Angle' : 'Added'}`;
  updateLabel();
  raySortToggleBtn.addEventListener('click', () => {
    raySortMode = (raySortMode === 'angle') ? 'added' : 'angle';
    updateLabel();
    onChange?.();
  });
  const parent = rayCountBadge.parentElement;
  if (parent) parent.insertBefore(raySortToggleBtn, rayCountBadge.nextSibling);
}

export function renderRaysSvg(){
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

export function wireSensorButtons(onChange, notify){
  cAddRay?.addEventListener('click', () => {
    const d = Number(cCustomDeg?.value || 0);
    const l = Number(cCustomLen?.value || 900);
    const added = pushRay(d, l);
    if (!added) {
      const caps = getCaps();
      notify?.(`Ray not added (duplicate or max ${caps.RAY_MAX})`, 'warn');
      onChange?.();
      return;
    }
    if (added && cMirrorAdd?.checked) {
      const m = normDeg(-added.Degrees);
      if (!(added.Degrees === 0 || Math.abs(added.Degrees) === 180)) {
        pushRay(m, l);
      }
    }
    onChange?.();
  });

  cClearRays?.addEventListener('click', () => { createCustomRays.length = 0; onChange?.(); });
  cMirrorAll?.addEventListener('click', () => {
    const snapshot = createCustomRays.slice();
    for (const r of snapshot) {
      const m = normDeg(-r.Degrees);
      if (!(r.Degrees === 0 || Math.abs(r.Degrees) === 180)) {
        pushRay(m, r.Length);
      }
    }
    onChange?.();
  });
}
