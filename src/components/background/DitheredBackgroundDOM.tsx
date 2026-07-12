'use dom';

import React, { useEffect, useRef } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

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

// MetalColors.footerBackground-adjacent near-black + a lighter charcoal grey
// (the app's two darkest metal tones), plus MetalColors.accentGlow red.
const COLOR_BLACK: readonly [number, number, number] = [28, 28, 30]; // #1c1c1e
const COLOR_GREY: readonly [number, number, number] = [46, 48, 50]; // #2e3032
const COLOR_RED: readonly [number, number, number] = [204, 26, 0]; // #cc1a00

function drawDither(ctx: CanvasRenderingContext2D, width: number, height: number, seed: number): void {
  const toneField = generateValueNoise(width, height, mulberry32(seed), 24);
  // Independent per-pixel draw (not smoothed) for the red mask, so red reads
  // as sparse flecks rather than smoothed blobs.
  const redRng = mulberry32(seed ^ 0x9e3779b9);

  const image = ctx.createImageData(width, height);
  const data = image.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const threshold = (BAYER_8X8[y % 8][x % 8] + 0.5) / 64;
      const isRed = redRng() > 0.96; // ~4% of pixels
      const color = isRed ? COLOR_RED : toneField[i] > threshold ? COLOR_GREY : COLOR_BLACK;
      const p = i * 4;
      data[p] = color[0];
      data[p + 1] = color[1];
      data[p + 2] = color[2];
      data[p + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
}

export default function DitheredBackgroundDOM({ seed }: DitheredBackgroundDOMProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const width = Math.max(1, Math.round(parent?.clientWidth ?? window.innerWidth));
    const height = Math.max(1, Math.round(parent?.clientHeight ?? window.innerHeight));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawDither(ctx, width, height, seed);
  }, [seed]);

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
