'use dom';

import React from 'react';
import { styled, createGlobalStyle } from 'styled-components';

// The DOM-component WebView's default document keeps the browser UA stylesheet
// (8px body margin etc.), which throws the button off-center inside its fixed
// width/height box. Reset it so Root's flex centering is exact.
const GlobalStyle = createGlobalStyle`
  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: transparent;
  }
`;

export interface RecordButtonDOMProps {
  isRecording: boolean;
  disabled?: boolean;
  onPress: () => Promise<void>;
  dom?: import('expo/dom').DOMProps;
}

export default function RecordButtonDOM({ isRecording, disabled = false, onPress }: RecordButtonDOMProps) {
  const handleChange = () => {
    if (disabled) return;
    void onPress();
  };

  return (
    <Root>
      <GlobalStyle />
      <StyledWrapper>
        <div>
          <label className="wrap" htmlFor="button" style={{ opacity: disabled ? 0.5 : 1 }}>
            <input
              type="checkbox"
              aria-label={isRecording ? 'stop recording' : 'start recording'}
              id="button"
              checked={isRecording}
              disabled={disabled}
              onChange={handleChange}
            />
            <button className="button" type="button">
              <div className="corner" />
              <div className="inner">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  {/* Base: etched record-lens — permanent ring + recessed dot */}
                  <g className="symbol">
                    <defs>
                      <linearGradient id="dotSurface" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#161718" />
                        <stop offset="100%" stopColor="#2e3032" />
                      </linearGradient>
                    </defs>
                    <circle cx={50} cy={50} r={40} fill="none" stroke="#212123" strokeWidth={7} />
                    <circle className="dot" cx={50} cy={50} r={18} fill="url(#dotSurface)" stroke="#111113" strokeWidth={1.5} />
                  </g>

                  {/* Directional rim light: bright top-left, fades bottom-right */}
                  <g className="symbol-inner-edge">
                    <defs>
                      <linearGradient id="rimLight" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
                        <stop offset="40%" stopColor="rgba(255,255,255,0.10)" />
                        <stop offset="100%" stopColor="rgba(255,255,255,0.00)" />
                      </linearGradient>
                    </defs>
                    <circle cx={50} cy={50} r={36.8} fill="none" stroke="url(#rimLight)" strokeWidth={1.2} />
                    <circle cx={50} cy={50} r={19.2} fill="none" stroke="url(#rimLight)" strokeWidth={1.2} />
                  </g>

                  {/* Glow layer for the pulsating dot (recording only) */}
                  <g className="symbol-path-glow">
                    <circle className="ring" cx={50} cy={50} r={40} pathLength={650} />
                    <circle className="dot" cx={50} cy={50} r={18} fill="none" />
                  </g>

                  {/* Crisp dot on top; brightness+contrast filter creates the etched edge */}
                  <g className="symbol-path">
                    <circle className="ring" cx={50} cy={50} r={40} pathLength={650} />
                    <circle className="dot" cx={50} cy={50} r={18} fill="none" />
                  </g>
                </svg>
              </div>
            </button>
            <div className="led" />
            <div className="bg">
              <div className="shine-1" />
              <div className="shine-2" />
            </div>
            <div className="bg-glow" />
          </label>
          <div className="noise">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="noise-pattern" patternUnits="userSpaceOnUse" width={500} height={500}>
                  <filter id="noise" x={0} y={0}>
                    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves={3} stitchTiles="stitch" />
                    <feBlend mode="screen" />
                  </filter>
                  <rect width={500} height={500} filter="url(#noise)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#noise-pattern)" />
            </svg>
          </div>
        </div>
      </StyledWrapper>
    </Root>
  );
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  background: transparent;
  /* Fades this WebView's own rendered pixels to true transparency at the
     top/bottom edges (a real alpha fade baked into the content itself,
     not a color guess layered on top from the RN side) — masks a faint
     residual tint the WebView's background otherwise leaves at its edges
     even when set to transparent. */
  mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
`;

const StyledWrapper = styled.div`
  .wrap {
    --radius: 30px;
    --bg: #000000;

    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    position: relative;
    pointer-events: none;
  }

  .wrap::before {
    content: "";
    position: absolute;
    width: 350px;
    height: 300px;
    border-radius: 50px;
    background-color: rgba(255, 255, 255, 0.05);
    filter: blur(60px);
    transform: skewY(-20deg);
  }

  .wrap::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50px;
    background-color: rgba(0, 0, 0, 0.5);
    filter: blur(30px);
  }

  .wrap input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    inset: 0;
    z-index: 999;
    cursor: pointer;
    pointer-events: all;
    user-select: none;
  }

  .button {
    position: relative;
    overflow: hidden;
    width: 154px;
    height: 150px;
    background-color: var(--bg);
    z-index: 2;
    border: transparent;
    border-radius: var(--radius);
    box-shadow:
      inset 0 1px 1px rgb(255 255 255 / 40%),
      inset 0 -6px 1px -4px #cc1a00,
      inset 0 -15px 6px -8px #b31500;
    transition:
      transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
      filter 0.25s ease,
      box-shadow 0.25s ease,
      background-color 0.25s ease;
  }
  .button::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: calc(var(--radius) * 0.8);
    border-top: 50px solid #414244;
    border-left: 40px solid #2b2b2c;
    border-right: 40px solid #2b2b2c;
    border-bottom: 50px solid #15161a;
    filter: blur(6px);
    transition: all 0.5s ease;
  }

  .button::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    margin: auto;
    top: 101%;
    height: 50px;
    width: 120px;
    border-radius: 50px 50px 0 0;
    background: #cc1a00;
    filter: contrast(10) blur(7px);
    transition: all 0.3s ease;
    opacity: 1;
  }

  .button .corner {
    transition: all 0.4s ease;
    opacity: 0.1;
  }
  .button .corner::before,
  .button .corner::after {
    content: "";
    position: absolute;
    top: 0;
    border-top: 55px solid white;
    border-left: 15px solid transparent;
    border-right: 15px solid transparent;
    filter: blur(6px);
  }
  .button .corner::before {
    left: 8px;
    transform: rotate(-40deg);
  }
  .button .corner::after {
    right: 8px;
    transform: rotate(40deg);
  }

  .wrap input:hover + .button .corner {
    opacity: 0.15;
  }

  .button .inner {
    z-index: 9;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    inset: 22px 20px;
    border-radius: calc(var(--radius) * 0.85);
    background: linear-gradient(180deg, #232324 5%, #46484b 100%);
    transition:
      transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
      background 0.25s ease,
      box-shadow 0.25s ease;
    box-shadow:
      inset 0 -5px 15px -1px rgba(0, 0, 0, 0.3),
      inset 0 -4px 3px -3px black,
      inset 0 -10px 20px -8px rgb(255 255 255 / 40%),
      inset 0 1px 0 1px rgb(255 255 255 / 20%);
  }
  .button .inner svg {
    display: block;
    overflow: visible;
    height: 52%;
  }

  /* ---- Record symbol: etched ring + dot, red accent on recording ---- */

  .button .inner svg .symbol {
    filter: none;
  }
  .button .inner svg .symbol-path {
    filter: brightness(1.1) contrast(1.1);
  }

  /* Idle: rings/dots invisible, ready to fade in when recording starts */
  .button .inner svg .symbol-path .ring {
    fill: none;
    stroke: transparent;
    stroke-width: 7;
    stroke-dasharray: none;
    stroke-dashoffset: 0;
    animation: none;
    transition: stroke 0.3s ease;
  }
  .button .inner svg .symbol-path .dot {
    fill: transparent;
    transition: fill 0.3s ease;
  }
  .button .inner svg .symbol-path-glow .ring {
    fill: none;
    stroke: transparent;
    stroke-width: 5;
    stroke-dasharray: none;
    stroke-dashoffset: 0;
    animation: none;
    filter: none;
    opacity: 1;
  }

  .bg {
    background-color: black;
    position: absolute;
    inset: -7px;
    border-radius: calc(var(--radius) * 1.25);
    box-shadow: 0 20px 10px -10px rgba(0, 0, 0, 0.3);
    transition: all 0.3s ease;
    overflow: hidden;
    z-index: 1;
  }
  .bg::before {
    content: "";
    position: absolute;
    border-radius: inherit;
    box-shadow:
      inset 0 -2px 0px -1px rgb(180 180 180 / 12%),
      inset 0 0 5px 1px black,
      inset 0 0 0 1px black;
    inset: 0;
    z-index: 1;
  }

  .bg .shine-1,
  .bg .shine-2::before {
    content: "";
    position: absolute;
    z-index: 0;
    transition: all 0.3s ease;
    background: rgb(200, 25, 0);
    width: 10px;
    height: 10px;
    left: 0;
    right: 0;
    bottom: 0;
    margin: auto;
    border-radius: 50%;
    filter: blur(2px);
    transform: translateY(0) scale(0);
    animation: bg 2.4s linear 0.3s;
  }
  .bg .shine-2::before {
    animation: bg 2.4s linear infinite;
  }
  .bg .shine-2 {
    transition: all 0.5s linear;
    opacity: 0;
  }

  .led {
    position: absolute;
    z-index: 10;
    top: 100%;
    border-radius: 50%;
    width: 6px;
    height: 6px;
    margin-top: 22px;
    transition: all 0.3s ease;
    background-color: #cc1a00;
    box-shadow:
      0 -10px 35px 17px #cc1a00,
      inset 0 1px 2px 0px rgba(255, 255, 255, 0.6),
      0 0 0px 3px rgb(0 0 0 / 60%),
      0 0 2px 4px rgba(140, 15, 0, 0.8);
  }

  .noise {
    position: absolute;
    top: -20px;
    bottom: -20px;
    left: 0;
    right: 0;
    opacity: 0.08;
    mask-image: linear-gradient(
      transparent 5%,
      white 30%,
      white 70%,
      transparent 95%
    );
    filter: grayscale(1);
  }

  /** STATES */

  .wrap input:hover + .button {
    transform: scale(1.02);
  }
  .wrap input:active + .button {
    transform: translateY(4px) scale(0.96);
    filter: contrast(1.1) brightness(0.9);
    background-color: transparent;
    box-shadow:
      inset 0 1px 1px rgb(255 255 255 / 15%),
      inset 0 2px 4px 0px rgba(0, 0, 0, 0.5),
      inset 0 -3px 1px -2px #cc1a00,
      inset 0 -6px 3px -4px #b31500;
    transition:
      transform 0.08s ease-out,
      filter 0.08s ease-out,
      box-shadow 0.08s ease-out,
      background-color 0.08s ease-out;
  }
  .wrap input:active + .button::before {
    box-shadow: 0 -4px 6px 6px black;
    transition: box-shadow 0.08s ease-out;
  }
  .wrap input:active + .button .inner {
    background: linear-gradient(180deg, #18191a 5%, #313336 100%);
    box-shadow:
      inset 0 3px 10px 0px rgba(0, 0, 0, 0.65),
      inset 0 -2px 2px -2px black,
      inset 0 -4px 10px -6px rgb(255 255 255 / 15%),
      inset 0 1px 0 1px rgb(255 255 255 / 8%);
    transform: translateY(2px) scale(0.94);
    transition:
      transform 0.08s ease-out,
      background 0.08s ease-out,
      box-shadow 0.08s ease-out;
  }
  .wrap input:active + .button ~ .bg {
    box-shadow: 0 8px 6px -8px rgba(0, 0, 0, 0.35);
    transition: box-shadow 0.08s ease-out;
  }
  .wrap input:active + .button ~ .led {
    filter: brightness(0.75);
    transition: filter 0.08s ease-out;
  }
  .wrap input:active + .button .corner,
  .wrap input:active + .button ~ .bg-glow,
  .wrap input:not(:checked):active + .button ~ .bg .shine-2 {
    opacity: 0;
  }

  .wrap input:not(:checked):hover + .button ~ .bg .shine-2 {
    opacity: 1;
  }
  .wrap input:not(:checked):hover + .button ~ .bg .shine-2::before {
    background: rgba(200, 25, 0, 0.9);
    filter: blur(3px);
    animation: bgHover 2s infinite linear;
  }

  /* ===== RECORDING (checked) — red pulsing dot + blinking LED ===== */

  .wrap input:checked + .button .inner svg .symbol-path-glow .ring {
    stroke: none;
    stroke-width: 0;
    filter: none;
    opacity: 0;
    animation: none;
  }
  .wrap input:checked + .button .inner svg .symbol-path-glow .dot {
    fill: #cc1a00;
    filter: blur(12px);
    opacity: 0.8;
    animation: dotPulseGlow 1.4s ease-in-out infinite alternate;
  }
  .wrap input:checked + .button .inner svg .symbol-path .ring {
    stroke: none;
    opacity: 0;
    animation: none;
  }
  .wrap input:checked + .button .inner svg .symbol-path .dot {
    fill: #cc2200;
    opacity: 0.9;
    animation: dotPulse 1.4s ease-in-out infinite alternate;
  }

  .wrap input:checked + .button {
    box-shadow:
      inset 0 1px 1px rgba(255, 255, 255, 0.4),
      inset 0 -6px 1px -4px #6b1515,
      inset 0 -15px 6px -8px #2e0a0a;
    background-color: #2c3238;
  }
  .wrap input:checked + .button::after {
    background: #3a1010;
  }

  .wrap input:checked + .button ~ .bg .shine-1 {
    background-color: rgba(255, 60, 60, 0.7);
  }
  .wrap input:checked + .button ~ .bg::before {
    box-shadow:
      inset 0 -2px 0px -1px rgba(255, 100, 100, 0.4),
      inset 0 0 5px 1px black,
      inset 0 0 0 1px black;
  }

  .wrap input:checked + .button ~ .led {
    background-color: #cc1818;
    box-shadow:
      0 -10px 18px 6px rgba(180, 20, 20, 0.55),
      inset 0 1px 2px 0px rgba(255, 255, 255, 0.5),
      0 0 0px 3px rgba(0, 0, 0, 0.6),
      0 0 2px 4px rgba(140, 10, 10, 0.6);
    animation: ledPulse 1.8s infinite alternate;
  }

  .bg-glow {
    transition: all 0.5s linear;
  }
  .bg-glow::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 30px;
    background: linear-gradient(to bottom, #ff2b2b 0%, black 100%);
    filter: blur(12px);
    opacity: 0;
    transition: opacity 0.4s ease;
  }
  .wrap input:checked + .button ~ .bg-glow::before {
    filter: blur(22px);
    opacity: 0.22;
    animation: bgGlowPulse 2.5s infinite alternate;
  }

  @keyframes bgHover {
    0% {
      transform: translateY(0) scale(0);
    }
    50% {
      transform: translateY(-150px) scale(20);
    }
    100% {
      transform: translateY(-300px) scale(15);
    }
  }

  @keyframes bg {
    0% {
      transform: translateY(0) scale(0);
    }
    12% {
      transform: translateY(0) scale(25);
    }
    60%,
    100% {
      transform: translateY(-280px) scale(20, 18);
    }
  }

  @keyframes dotPulse {
    0% {
      fill: #881500;
      opacity: 0.5;
    }
    100% {
      fill: #dd2200;
      opacity: 1;
    }
  }

  @keyframes dotPulseGlow {
    0% {
      opacity: 0.3;
      filter: blur(10px);
    }
    100% {
      opacity: 0.85;
      filter: blur(16px);
    }
  }

  @keyframes ledPulse {
    0% {
      background-color: #b81212;
      box-shadow:
        0 -10px 18px 6px rgba(160, 15, 15, 0.45),
        inset 0 1px 2px 0px rgba(255, 255, 255, 0.4),
        0 0 0px 3px rgba(0, 0, 0, 0.6),
        0 0 2px 4px rgba(120, 8, 8, 0.5);
    }
    100% {
      background-color: #e02020;
      box-shadow:
        0 -10px 26px 10px rgba(200, 25, 25, 0.6),
        inset 0 1px 2px 0px rgba(255, 255, 255, 0.6),
        0 0 0px 3px rgba(0, 0, 0, 0.5),
        0 0 3px 5px rgba(160, 12, 12, 0.7);
    }
  }

  @keyframes bgGlowPulse {
    0% {
      opacity: 0.18;
      filter: blur(22px);
    }
    100% {
      opacity: 0.28;
      filter: blur(26px);
    }
  }
`;
