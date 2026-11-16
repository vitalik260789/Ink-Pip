// Ink & Pip (approved 14.11.2026) + who speaks when (mouth movement), generated from timeline/lines.json.
import { talkAmount } from '/engine/core.js';
export const INK = { top: 'hoodie', color: '#2fb8a8', head: 'none' };
export const PIP = { top: 'hoodie', color: '#f29ac0', head: 'pigtails', headColor: '#ff5fa2', ink: '#efe9df', inkFar: '#b9b0c6', faceColor: '#1c1724' };
export const LINES = [
  ['PIP', 0.080, 2.376],
  ['INK', 2.516, 3.951],
  ['PIP', 4.091, 5.101],
  ['INK', 5.241, 9.532],
  ['PIP', 9.672, 11.773],
  ['INK', 11.913, 18.886],
  ['PIP', 19.026, 19.633],
  ['INK', 19.773, 26.882],
  ['PIP', 27.022, 28.363],
  ['INK', 28.503, 34.759],
  ['PIP', 34.899, 35.731],
  ['INK', 35.871, 42.493],
  ['PIP', 42.633, 44.629],
  ['INK', 44.769, 48.245],
  ['PIP', 48.385, 49.731],
  ['INK', 49.871, 50.965],
  ['PIP', 51.105, 52.206]];
export const talkOf = (who, gT) => { const L = LINES.find(l => l[0] === who && gT >= l[1] && gT <= l[2]); return L ? talkAmount(gT, L[1], L[2]) : 0; };
