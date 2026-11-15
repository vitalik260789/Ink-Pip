// Ink & Pip (approved 14.11.2026). Lines + who speaks when (for mouth movement).
import { talkAmount } from '/engine/core.js';
export const INK = { top: 'hoodie', color: '#2fb8a8', head: 'none' };
export const PIP = { top: 'hoodie', color: '#f29ac0', head: 'pigtails', headColor: '#ff5fa2', ink: '#efe9df', inkFar: '#b9b0c6', faceColor: '#1c1724' };
export const LINES = [
  ['PIP', 0.25, 2.236], ['INK', 2.456, 9.001], ['PIP', 9.221, 10.887], ['INK', 11.107, 16.832], ['PIP', 17.052, 18.213], ['INK', 18.433, 25.98],
  ['PIP', 26.2, 26.618], ['INK', 26.838, 35.76], ['PIP', 35.98, 37.08], ['INK', 37.3, 44.806], ['PIP', 45.026, 47.643], ['INK', 47.863, 50.279]];
export const talkOf = (who, gT) => { const L = LINES.find(l => l[0] === who && gT >= l[1] && gT <= l[2]); return L ? talkAmount(gT, L[1], L[2]) : 0; };
