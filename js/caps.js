import { devForm, devOverride, ovMaxLayers, ovMaxNodes } from './dom.js';

export const DEFAULT_CAPS  = { IN_MAX: 20, H_MAX: 12, LAYERS_MAX: 8,  snapAngles: true };
export const OVERRIDE_CAPS = { IN_MAX: 999, H_MAX: 64, LAYERS_MAX: 20, snapAngles: false };

export const BASE_RAY_MAX     = 13;
export const OVERRIDE_RAY_MAX = 360;

export function getCaps(){
  if (devOverride && devOverride.checked){
    return {
      IN_MAX: OVERRIDE_CAPS.IN_MAX,
      H_MAX: Math.max(1, Number(ovMaxNodes?.value || OVERRIDE_CAPS.H_MAX)),
      LAYERS_MAX: Math.max(3, Number(ovMaxLayers?.value || OVERRIDE_CAPS.LAYERS_MAX)),
      snapAngles: false,
      RAY_MAX: OVERRIDE_RAY_MAX
    };
  }
  return { ...DEFAULT_CAPS, RAY_MAX: BASE_RAY_MAX };
}

export function applyOverrideUI(){
  if (!devForm || !devOverride) return;
  devForm.style.opacity = devOverride.checked ? '1' : '.6';
  devForm.style.pointerEvents = devOverride.checked ? 'auto' : 'none';
  const degInput = document.getElementById('cCustomDeg');
  if (degInput) degInput.step = devOverride.checked ? '1' : '5';
}