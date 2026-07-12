'use dom';

import React, { useEffect, useRef } from 'react';
import { styled, createGlobalStyle } from 'styled-components';

// Matches the reset used by RecordButtonDOM.tsx / FooterDOM.tsx so the
// WebView's default document doesn't add margin/UA-stylesheet offsets.
const GlobalStyle = createGlobalStyle`
  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: transparent;
  }
`;

export interface DitheredBackgroundDOMProps {
  /** Bump this to redraw a new pattern; the same seed always redraws identically. */
  seed: number;
  dom?: import('expo/dom').DOMProps;
}

// 8x8 Bayer ordered-dither matrix (values 0-63).
const BAYER_8X8 = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [2, 50, 14, 62, 1, 49, 13, 61],
  [34, 18, 46, 30, 33, 17, 45, 29],
  [10, 58, 6, 54, 9, 57, 5, 53],
  [42, 26, 38, 22, 41, 25, 37, 21],
];

// Deterministic PRNG (mulberry32) so a given seed always draws the same
// pattern — no dependency needed for this.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bilinear-interpolated value noise: a coarse grid of random values,
// upsampled to (width, height) so the tone field has cloud-like structure
// instead of reading as flat static.
function generateValueNoise(
  width: number,
  height: number,
  rng: () => number,
  cell: number,
): Float32Array {
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  const grid = new Float32Array(cols * rows);
  for (let i = 0; i < grid.length; i++) grid[i] = rng();

  const field = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const gy = y / cell;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    for (let x = 0; x < width; x++) {
      const gx = x / cell;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const v00 = grid[y0 * cols + x0];
      const v10 = grid[y0 * cols + x0 + 1];
      const v01 = grid[(y0 + 1) * cols + x0];
      const v11 = grid[(y0 + 1) * cols + x0 + 1];
      const top = v00 + (v10 - v00) * fx;
      const bottom = v01 + (v11 - v01) * fx;
      field[y * width + x] = top + (bottom - top) * fy;
    }
  }
  return field;
}

// MetalColors.footerBackground-adjacent near-black + MetalColors.accentGlow red + a subtle charcoal grey.
const COLOR_BLACK: readonly [number, number, number] = [28, 28, 30]; // #1c1c1e
const COLOR_GREY: readonly [number, number, number] = [46, 48, 50]; // #2e3032
const COLOR_RED: readonly [number, number, number] = [204, 26, 0]; // #cc1a00

function generateDitherFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frameSeed: number,
): ImageData {
  const toneField = generateValueNoise(width, height, mulberry32(frameSeed), 24);
  const redRng = mulberry32(frameSeed ^ 0x9e3779b9);

  const image = ctx.createImageData(width, height);
  const data = image.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const threshold = (BAYER_8X8[y % 8][x % 8] + 0.5) / 64;
      
      // Black vs Grey dither
      let color = toneField[i] > threshold ? COLOR_GREY : COLOR_BLACK;

      // Extremely sparse red flecks (~0.5%)
      const isRed = redRng() > 0.995;
      if (isRed) {
        color = COLOR_RED;
      }

      const p = i * 4;
      data[p] = color[0];
      data[p + 1] = color[1];
      data[p + 2] = color[2];
      data[p + 3] = 255;
    }
  }

  return image;
}

export default function DitheredBackgroundDOM({ seed }: DitheredBackgroundDOMProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<ImageData[]>([]);
  const currentFrameRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = Math.max(1, Math.round(entry.contentRect.width || parent.clientWidth || window.innerWidth));
        const height = Math.max(1, Math.round(entry.contentRect.height || parent.clientHeight || window.innerHeight));

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // Generate 4 frames of animated dithered noise
        const frames: ImageData[] = [];
        for (let f = 0; f < 4; f++) {
          const frameSeed = seed + f * 12345;
          frames.push(generateDitherFrame(ctx, width, height, frameSeed));
        }

        framesRef.current = frames;
        currentFrameRef.current = 0;

        // Render first frame immediately
        ctx.putImageData(frames[0], 0, 0);
      }
    });

    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [seed]);

  // Continuous loop animation running at ~12 FPS
  useEffect(() => {
    let lastTime = 0;
    const interval = 80; // 80ms per frame (~12.5 FPS)

    const tick = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }
      const ctx = canvas.getContext('2d');
      const frames = framesRef.current;

      if (ctx && frames.length > 0) {
        if (time - lastTime >= interval) {
          currentFrameRef.current = (currentFrameRef.current + 1) % frames.length;
          ctx.putImageData(frames[currentFrameRef.current], 0, 0);
          lastTime = time;
        }
      }
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <Root>
      <GlobalStyle />
      <Canvas ref={canvasRef} />
    </Root>
  );
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  background: #1c1c1e;
`;

const Canvas = styled.canvas`
  display: block;
  width: 100%;
  height: 100%;
`;
