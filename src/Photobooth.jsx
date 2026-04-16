import { useRef, useState, useCallback, useEffect } from 'react';
import StripEditor from './StripEditor';
import PhotoBoard from './PhotoBoard';
import { loadBoardItems, makePendingItem, persistItem } from './boardService';

// Post-processing: lift blacks, add grain, tint
function liftBlacks(ctx, w, h, amount) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = d[i]     + (amount - d[i])     * (amount / 255);
    d[i + 1] = d[i + 1] + (amount - d[i + 1]) * (amount / 255);
    d[i + 2] = d[i + 2] + (amount - d[i + 2]) * (amount / 255);
  }
  ctx.putImageData(img, 0, 0);
}

function addGrain(ctx, w, h, intensity) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity;
    d[i]     = Math.min(255, Math.max(0, d[i] + noise));
    d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise));
    d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise));
  }
  ctx.putImageData(img, 0, 0);
}

function warmTint(ctx, w, h, r, g, b, opacity) {
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

// Levels: crush shadows below blackPoint, brighten above whitePoint
function applyLevels(ctx, w, h, blackPoint, whitePoint) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const range = whitePoint - blackPoint;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = d[i + c];
      v = ((v - blackPoint) / range) * 255;
      d[i + c] = Math.min(255, Math.max(0, v));
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Radial vignette darkening
function addVignette(ctx, w, h, strength) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(w, h) * 0.55;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// YCbCr skin detection: returns true if pixel is likely skin
function isSkin(r, g, b) {
  const y  =  0.299 * r + 0.587 * g + 0.114 * b;
  const cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
  const cr =  0.500 * r - 0.419 * g - 0.081 * b + 128;
  return y > 50 && y < 230 && cb > 77 && cb < 127 && cr > 133 && cr < 173;
}

// Box blur helper (separable, fast)
function boxBlur(src, w, h, radius) {
  const out = new Float32Array(src.length);
  const len = w * h;
  // Horizontal pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = Math.min(w - 1, Math.max(0, x + dx));
        const ni = (y * w + nx) * 4;
        sumR += src[ni]; sumG += src[ni + 1]; sumB += src[ni + 2];
        count++;
      }
      const i = (y * w + x) * 4;
      out[i] = sumR / count; out[i + 1] = sumG / count; out[i + 2] = sumB / count; out[i + 3] = src[i + 3];
    }
  }
  const out2 = new Float32Array(out.length);
  // Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = Math.min(h - 1, Math.max(0, y + dy));
        const ni = (ny * w + x) * 4;
        sumR += out[ni]; sumG += out[ni + 1]; sumB += out[ni + 2];
        count++;
      }
      const i = (y * w + x) * 4;
      out2[i] = sumR / count; out2[i + 1] = sumG / count; out2[i + 2] = sumB / count; out2[i + 3] = out[i + 3];
    }
  }
  return out2;
}

// 醒圖-style 磨皮: high-pass invert overlay blend, skin-only
// Removes pores/fine texture while keeping edges and structure perfectly sharp
function applyMopi(ctx, w, h, blurRadius = 10, strength = 0.4) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const blurred = boxBlur(d, w, h, blurRadius);

  for (let i = 0; i < d.length; i += 4) {
    if (!isSkin(d[i], d[i + 1], d[i + 2])) continue;

    for (let c = 0; c < 3; c++) {
      const orig = d[i + c];
      const blur = blurred[i + c];
      // High-pass = orig - blur + 128 (the texture layer)
      const highPass = orig - blur + 128;
      // Invert the high-pass
      const inverted = 255 - highPass;
      // Overlay blend: combines inverted high-pass with original
      // This specifically cancels out fine texture (pores) while keeping structure
      let blended;
      if (orig <= 128) {
        blended = (2 * orig * inverted) / 255;
      } else {
        blended = 255 - (2 * (255 - orig) * (255 - inverted)) / 255;
      }
      // Mix with original at strength ratio
      d[i + c] = Math.round(orig + (blended - orig) * strength);
    }
  }
  ctx.putImageData(img, 0, 0);
}

// High-pass frequency separation: isolate texture (wrinkles), reduce it, add back
function applyFrequencySeparation(ctx, w, h, blurRadius = 10, textureReduce = 0.5) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const blurred = boxBlur(d, w, h, blurRadius);

  for (let i = 0; i < d.length; i += 4) {
    if (!isSkin(d[i], d[i + 1], d[i + 2])) continue;
    for (let c = 0; c < 3; c++) {
      // High-freq = original - blurred (the texture/wrinkle layer)
      const highFreq = d[i + c] - blurred[i + c];
      // Reduce high-freq and add back to blurred base
      d[i + c] = Math.min(255, Math.max(0, Math.round(blurred[i + c] + highFreq * textureReduce)));
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Multi-pass bilateral with skin mask: 3 scales for different wrinkle sizes
function applySkinSmoothing(ctx, w, h, _radius = 5, intensity = 0.7) {
  const passes = [
    { radius: 3, threshold: 25 },  // skin texture smoothing
  ];

  for (const pass of passes) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const src = new Uint8ClampedArray(d);

    for (let i = 0; i < d.length; i += 4) {
      if (!isSkin(src[i], src[i + 1], src[i + 2])) continue;

      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      const cR = src[i], cG = src[i + 1], cB = src[i + 2];
      const idx = i / 4;
      const x = idx % w, y = (idx / w) | 0;
      const r = pass.radius;
      const step = r > 6 ? 2 : 1;

      for (let dy = -r; dy <= r; dy += step) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -r; dx <= r; dx += step) {
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const ni = (ny * w + nx) * 4;
          const diff = (Math.abs(src[ni] - cR) + Math.abs(src[ni + 1] - cG) + Math.abs(src[ni + 2] - cB)) / 3;
          if (diff < pass.threshold) {
            sumR += src[ni]; sumG += src[ni + 1]; sumB += src[ni + 2];
            count++;
          }
        }
      }
      if (count > 0) {
        d[i]     = Math.round(cR + (sumR / count - cR) * intensity);
        d[i + 1] = Math.round(cG + (sumG / count - cG) * intensity);
        d[i + 2] = Math.round(cB + (sumB / count - cB) * intensity);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
}

// Soft glow: blend with blurred copy for luminous diffusion
function applySoftGlow(ctx, w, h, amount = 0.4) {
  const orig = ctx.getImageData(0, 0, w, h);
  const glow = ctx.getImageData(0, 0, w, h);
  const d = glow.data;
  const src = new Uint8ClampedArray(d);
  const r = 8;

  for (let i = 0; i < d.length; i += 4) {
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    const idx = i / 4;
    const x = idx % w, y = (idx / w) | 0;
    for (let dy = -r; dy <= r; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        const ni = (ny * w + nx) * 4;
        sumR += src[ni]; sumG += src[ni + 1]; sumB += src[ni + 2];
        count++;
      }
    }
    d[i]     = Math.round(orig.data[i]     + (sumR / count - orig.data[i])     * amount);
    d[i + 1] = Math.round(orig.data[i + 1] + (sumG / count - orig.data[i + 1]) * amount);
    d[i + 2] = Math.round(orig.data[i + 2] + (sumB / count - orig.data[i + 2]) * amount);
  }
  ctx.putImageData(glow, 0, 0);
}

// Lift shadows and brighten midtones
function liftShadowsKorean(ctx, w, h, shadowLift = 50, midtoneBoost = 1.15) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let v = d[i + c];
      v = Math.min(255, v + shadowLift);
      if (v >= 50 && v <= 200) v = Math.min(255, v * midtoneBoost);
      d[i + c] = Math.round(v);
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Highlight-only bloom: glow restricted to bright areas (dewy/glass skin)
function applyHighlightBloom(ctx, w, h, threshold = 180, amount = 0.5) {
  const orig = ctx.getImageData(0, 0, w, h);
  const d = orig.data;
  const src = new Uint8ClampedArray(d);
  const r = 6;

  for (let i = 0; i < d.length; i += 4) {
    const lum = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114);
    if (lum < threshold) continue;

    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    const idx = i / 4;
    const x = idx % w, y = (idx / w) | 0;
    for (let dy = -r; dy <= r; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        const ni = (ny * w + nx) * 4;
        sumR += src[ni]; sumG += src[ni + 1]; sumB += src[ni + 2];
        count++;
      }
    }
    const blend = ((lum - threshold) / (255 - threshold)) * amount;
    d[i]     = Math.min(255, Math.round(d[i]     + (sumR / count - d[i])     * blend));
    d[i + 1] = Math.min(255, Math.round(d[i + 1] + (sumG / count - d[i + 1]) * blend));
    d[i + 2] = Math.min(255, Math.round(d[i + 2] + (sumB / count - d[i + 2]) * blend));
  }
  ctx.putImageData(orig, 0, 0);
}

// Cool-toned color grade: blue/violet shift in shadows for fair/transparent skin
function applyCoolGrade(ctx, w, h, strength = 0.15) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    const shadowFactor = Math.max(0, 1 - lum / 150) * strength;
    d[i]     = Math.max(0, Math.round(d[i]     - shadowFactor * 15));     // reduce red
    d[i + 1] = Math.max(0, Math.round(d[i + 1] - shadowFactor * 5));      // slight green reduce
    d[i + 2] = Math.min(255, Math.round(d[i + 2] + shadowFactor * 20));   // add blue
  }
  ctx.putImageData(img, 0, 0);
}

// Negative clarity: reduce local contrast to fade wrinkles
function applyNegativeClarity(ctx, w, h, strength = 0.4) {
  const orig = ctx.getImageData(0, 0, w, h);
  const d = orig.data;
  const src = new Uint8ClampedArray(d);
  const r = 10;

  for (let i = 0; i < d.length; i += 4) {
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    const idx = i / 4;
    const x = idx % w, y = (idx / w) | 0;
    for (let dy = -r; dy <= r; dy += 2) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -r; dx <= r; dx += 2) {
        const nx = x + dx;
        if (nx < 0 || nx >= w) continue;
        const ni = (ny * w + nx) * 4;
        sumR += src[ni]; sumG += src[ni + 1]; sumB += src[ni + 2];
        count++;
      }
    }
    // Blend toward local average — reduces local contrast (wrinkles fade)
    d[i]     = Math.round(d[i]     + (sumR / count - d[i])     * strength);
    d[i + 1] = Math.round(d[i + 1] + (sumG / count - d[i + 1]) * strength);
    d[i + 2] = Math.round(d[i + 2] + (sumB / count - d[i + 2]) * strength);
  }
  ctx.putImageData(orig, 0, 0);
}

// De-saturate shadows: prevents muddy look, keeps face clean
function desatShadows(ctx, w, h, threshold = 100, strength = 0.5) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
    if (lum >= threshold) continue;
    const factor = (1 - lum / threshold) * strength;
    d[i]     = Math.round(d[i]     + (lum - d[i])     * factor);
    d[i + 1] = Math.round(d[i + 1] + (lum - d[i + 1]) * factor);
    d[i + 2] = Math.round(d[i + 2] + (lum - d[i + 2]) * factor);
  }
  ctx.putImageData(img, 0, 0);
}

// Detect ctx.filter support (Safari doesn't have it)
const _testCanvas = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
const SUPPORTS_CTX_FILTER = _testCanvas && 'filter' in _testCanvas && (() => {
  _testCanvas.filter = 'blur(1px)';
  return _testCanvas.filter === 'blur(1px)';
})();

// Pixel-level filter implementations for Safari fallback
function applyPixelFilters(ctx, w, h, cssFilter) {
  if (!cssFilter || cssFilter === 'none') return;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // Parse CSS filter string into operations
  const ops = [];
  const re = /(blur|brightness|contrast|saturate|sepia|grayscale|hue-rotate)\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(cssFilter)) !== null) {
    const name = m[1];
    const raw = m[2];
    let val = parseFloat(raw);
    if (raw.includes('deg')) val = parseFloat(raw);
    ops.push({ name, val });
  }

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];

    for (const op of ops) {
      if (op.name === 'brightness') {
        r *= op.val; g *= op.val; b *= op.val;
      } else if (op.name === 'contrast') {
        r = ((r / 255 - 0.5) * op.val + 0.5) * 255;
        g = ((g / 255 - 0.5) * op.val + 0.5) * 255;
        b = ((b / 255 - 0.5) * op.val + 0.5) * 255;
      } else if (op.name === 'saturate') {
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = gray + (r - gray) * op.val;
        g = gray + (g - gray) * op.val;
        b = gray + (b - gray) * op.val;
      } else if (op.name === 'grayscale') {
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = r + (gray - r) * op.val;
        g = g + (gray - g) * op.val;
        b = b + (gray - b) * op.val;
      } else if (op.name === 'sepia') {
        const sr = 0.393 * r + 0.769 * g + 0.189 * b;
        const sg = 0.349 * r + 0.686 * g + 0.168 * b;
        const sb = 0.272 * r + 0.534 * g + 0.131 * b;
        r = r + (sr - r) * op.val;
        g = g + (sg - g) * op.val;
        b = b + (sb - b) * op.val;
      } else if (op.name === 'hue-rotate') {
        const angle = op.val * Math.PI / 180;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const nr = r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928);
        const ng = r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.140) + b * (0.072 - cos * 0.072 - sin * 0.283);
        const nb = r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072);
        r = nr; g = ng; b = nb;
      }
      // blur is skipped in pixel mode — the CSS preview already shows it
    }

    d[i]   = Math.min(255, Math.max(0, r));
    d[i+1] = Math.min(255, Math.max(0, g));
    d[i+2] = Math.min(255, Math.max(0, b));
  }
  ctx.putImageData(img, 0, 0);
}

const FILTERS = [
  // 醒圖-style 磨皮 filters (no global blur, skin-only processing)
  {
    name: 'Natural',
    css: 'brightness(1.08) contrast(0.95) saturate(1.05)',
    post: (ctx, w, h) => {
      applyMopi(ctx, w, h, 8, 0.3);
      liftBlacks(ctx, w, h, 20);
    },
  },
  {
    name: 'Dewy',
    css: 'brightness(1.12) contrast(0.92) saturate(0.98)',
    post: (ctx, w, h) => {
      applyMopi(ctx, w, h, 10, 0.4);
      applyHighlightBloom(ctx, w, h, 200, 0.25);
      desatShadows(ctx, w, h, 90, 0.2);
      applyCoolGrade(ctx, w, h, 0.06);
    },
  },
  // Glass skin / Chok-Chok filters
  {
    name: 'Porcelain',
    css: 'brightness(1.2) contrast(0.9) saturate(0.95) blur(1.2px)',
    post: (ctx, w, h) => {
      desatShadows(ctx, w, h, 90, 0.25);
      applyCoolGrade(ctx, w, h, 0.08);
    },
  },
  {
    name: 'Chok-Chok',
    css: 'brightness(1.15) contrast(0.85) saturate(0.9) blur(1.5px)',
    post: (ctx, w, h) => {
      liftShadowsKorean(ctx, w, h, 25, 1.05);
      desatShadows(ctx, w, h, 100, 0.3);
      applyCoolGrade(ctx, w, h, 0.1);
    },
  },
  { name: 'Tokyo Film', css: 'hue-rotate(-5deg) saturate(1.2) brightness(1.05) contrast(0.9) blur(1.5px)' },
  { name: 'Sakura Glow', css: 'hue-rotate(-15deg) saturate(1.4) brightness(1.1) contrast(0.9) blur(1.5px)' },
  { name: 'Morning Light', css: 'blur(1.5px) brightness(1.1) contrast(0.9) saturate(1.1)' },
  // 90s analog photobooth filters
  {
    name: '90s Booth',
    css: 'sepia(0.25) contrast(0.8) saturate(0.9) brightness(1.05) blur(2px)',
    post: (ctx, w, h) => { liftBlacks(ctx, w, h, 35); addGrain(ctx, w, h, 40); },
  },
  {
    name: 'Faded Film',
    css: 'sepia(0.15) contrast(0.75) saturate(0.7) brightness(1.1) blur(1.8px)',
    post: (ctx, w, h) => { liftBlacks(ctx, w, h, 50); warmTint(ctx, w, h, 255, 240, 220, 0.15); addGrain(ctx, w, h, 35); },
  },
  {
    name: 'Warm Booth',
    css: 'sepia(0.35) contrast(0.85) saturate(1.1) brightness(1.05) blur(2px)',
    post: (ctx, w, h) => { liftBlacks(ctx, w, h, 30); warmTint(ctx, w, h, 255, 200, 160, 0.1); addGrain(ctx, w, h, 30); },
  },
  {
    name: 'Cold Booth',
    css: 'sepia(0.05) hue-rotate(10deg) contrast(0.8) saturate(0.8) brightness(1.05) blur(2px)',
    post: (ctx, w, h) => { liftBlacks(ctx, w, h, 40); warmTint(ctx, w, h, 200, 210, 240, 0.12); addGrain(ctx, w, h, 45); },
  },
  {
    name: 'Aged Strip',
    css: 'sepia(0.4) contrast(0.7) saturate(0.6) brightness(1.1) blur(2.2px)',
    post: (ctx, w, h) => { liftBlacks(ctx, w, h, 55); warmTint(ctx, w, h, 240, 220, 180, 0.2); addGrain(ctx, w, h, 50); },
  },
  {
    name: 'Grainy B&W',
    css: 'grayscale(1) contrast(0.85) brightness(1.1) blur(1.8px)',
    post: (ctx, w, h) => { liftBlacks(ctx, w, h, 40); addGrain(ctx, w, h, 55); },
  },
  // 1970s B&W photobooth
  {
    name: '70s Harsh',
    css: 'grayscale(1) contrast(1.8) brightness(1.05) blur(1.2px)',
    post: (ctx, w, h) => { applyLevels(ctx, w, h, 45, 210); addGrain(ctx, w, h, 75); addVignette(ctx, w, h, 0.6); },
  },
  {
    name: '70s Sepia',
    css: 'grayscale(1) sepia(0.35) contrast(1.6) brightness(1.1) blur(1.5px)',
    post: (ctx, w, h) => { applyLevels(ctx, w, h, 35, 215); warmTint(ctx, w, h, 200, 180, 140, 0.08); addGrain(ctx, w, h, 60); addVignette(ctx, w, h, 0.5); },
  },
];

export default function Photobooth() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [filter, setFilter] = useState(0);
  const [flash, setFlash] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [showBoard, setShowBoard] = useState(false);
  const [boardItems, setBoardItems] = useState([]);
  const [myStripId, setMyStripId] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      setStream(s);
      setCameraError(null);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (err) {
      setCameraError('Could not access camera. Please allow camera permissions!');
    }
  }, []);

  useEffect(() => {
    startCamera();
    loadBoardItems().then(items => {
      setBoardItems(items);
      if (items.length > 0) setShowBoard(true);
    });
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const takePhoto = useCallback(() => {
    if (!stream) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    // Wait for video to have actual dimensions
    if (!video.videoWidth || !video.videoHeight) return;

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    // Crop source to 4:3 to match viewfinder (object-fit: cover)
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const TARGET_RATIO = 4 / 3;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (vw / vh > TARGET_RATIO) {
      sw = vh * TARGET_RATIO;
      sx = (vw - sw) / 2;
    } else if (vw / vh < TARGET_RATIO) {
      sh = vw / TARGET_RATIO;
      sy = (vh - sh) / 2;
    }
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext('2d');

    // Mirror the image (selfie mode), draw the 4:3 crop
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    if (SUPPORTS_CTX_FILTER) {
      ctx.filter = FILTERS[filter].css;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = 'none';

    // Safari fallback: apply filters via pixel manipulation
    if (!SUPPORTS_CTX_FILTER) {
      applyPixelFilters(ctx, canvas.width, canvas.height, FILTERS[filter].css);
    }

    // Run post-processing (grain, lifted blacks, tint) if filter has it
    if (FILTERS[filter].post) {
      FILTERS[filter].post(ctx, canvas.width, canvas.height);
    }

    const dataUrl = canvas.toDataURL('image/png');
    setPendingPhoto(dataUrl);
  }, [stream, filter]);

  const proceedPhoto = useCallback(() => {
    if (!pendingPhoto) return;
    setPhotos(prev => [...prev, pendingPhoto]);
    setPendingPhoto(null);
  }, [pendingPhoto]);

  const startCountdown = useCallback(() => {
    if (!stream || countdown !== null) return;
    setCountdown(3);
    let count = 3;
    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(timer);
        setCountdown(null);
        takePhoto();
      }
    }, 1000);
  }, [stream, countdown, takePhoto]);

  const retakePhoto = useCallback(() => {
    setPendingPhoto(null);
  }, []);

  useEffect(() => {
    if (photos.length === 4 && !showEditor) setShowEditor(true);
  }, [photos.length, showEditor]);

  return (
    <div className="photobooth">
      <div className="camera-section">
        <div className="viewfinder">
          {/* Decorative corner brackets */}
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />

          {/* Scanline overlay */}
          <div className="scanlines" />

          {cameraError ? (
            <div className="camera-error">
              <span className="error-icon">!</span>
              <p>{cameraError}</p>
              <button onClick={startCamera} className="btn btn-small">
                RETRY
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: FILTERS[filter].css }}
            />
          )}

          <div className="photo-counter-overlay">
            {[0, 1, 2, 3].map(i => {
              const taken = i < photos.length;
              const current = i === photos.length && !pendingPhoto;
              const pending = i === photos.length && !!pendingPhoto;
              return <div key={i} className={`counter-frame ${taken ? 'taken' : ''} ${current ? 'current' : ''} ${pending ? 'pending' : ''}`} />;
            })}
          </div>

          {countdown !== null && (
            <div className="countdown">
              <span key={countdown}>{countdown}</span>
            </div>
          )}

          {flash && <div className="flash" />}

          {pendingPhoto && (
            <div className="photo-review">
              <img src={pendingPhoto} alt="Review" />
              <button className="btn btn-download review-retake" onClick={retakePhoto}>
                RETAKE
              </button>
            </div>
          )}
        </div>

        <div className="controls">
          <div className="filter-bar">
            {FILTERS.map((f, i) => (
              <button
                key={f.name}
                className={`btn btn-filter ${i === filter ? 'active' : ''}`}
                onClick={() => photos.length === 0 && setFilter(i)}
                disabled={photos.length > 0}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="action-bar">
            {pendingPhoto ? (
              <button className="btn btn-capture" onClick={proceedPhoto}>
                KEEP
              </button>
            ) : (
              <button
                className="btn btn-capture"
                onClick={startCountdown}
                disabled={!stream || countdown !== null}
              >
                SNAP!
              </button>
            )}
          </div>
        </div>
      </div>


      {showEditor && (
        <StripEditor
          photos={photos.slice(0, 4)}
          onClose={() => { setShowEditor(false); setPhotos([]); }}
          onDone={(stripImage) => {
            setShowEditor(false);
            setPhotos([]);
            const pending = makePendingItem(stripImage);
            setMyStripId(pending.id);
            setBoardItems(prev => [...prev, pending]);
            setShowBoard(true);
            persistItem(pending)
              .then(saved => {
                setBoardItems(prev => prev.map(i => i.localId === pending.localId ? saved : i));
                setMyStripId(saved.id);
              })
              .catch(e => console.error('[board] ❌ Failed to save strip to Firestore:', e));
          }}
        />
      )}

      {showBoard && (
        <PhotoBoard
          items={boardItems}
          myStripId={myStripId}
          onUpdateItem={(id, changes) =>
            setBoardItems(prev => prev.map(i => i.id === id ? { ...i, ...changes } : i))
          }
          onDeleteItem={(id) => setBoardItems(prev => prev.filter(i => i.id !== id))}
          onNewRound={() => { setShowBoard(false); setMyStripId(null); }}
        />
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
