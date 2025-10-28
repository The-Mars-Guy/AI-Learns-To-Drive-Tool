export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const fmt = (o) => { try { return JSON.stringify(o, null, 2); } catch(e){ return String(o); } };

export function setCStatus(el, message, level = '') {
  if (!el) return;
  el.textContent = message || '';
  el.classList.remove('ok','warn','danger');
  if (['ok','warn','danger'].includes(level)) el.classList.add(level);
}