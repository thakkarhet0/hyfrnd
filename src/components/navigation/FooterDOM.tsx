'use dom';

import React from 'react';
import { styled, createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  html, body, #root {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: transparent;
  }
`;

export type FooterTabKey = 'capture' | 'calendar' | 'contacts' | 'settings';

export interface FooterDOMProps {
  activeTab: FooterTabKey;
  labels: Record<FooterTabKey, string>;
  bottomInset: number;
  onSelect: (tab: FooterTabKey) => Promise<void>;
  dom?: import('expo/dom').DOMProps;
}

const TABS: FooterTabKey[] = ['capture', 'calendar', 'contacts', 'settings'];

function IconShape({ variant }: { variant: FooterTabKey }) {
  if (variant === 'capture') {
    return (
      <>
        <rect x={24} y={8} width={16} height={26} rx={8} />
        <path d="M18 30a14 14 0 0 0 28 0" />
        <line x1={32} y1={44} x2={32} y2={52} />
        <line x1={22} y1={52} x2={42} y2={52} />
      </>
    );
  }
  if (variant === 'calendar') {
    return (
      <>
        <rect x={14} y={16} width={36} height={34} rx={4} />
        <line x1={14} y1={26} x2={50} y2={26} />
        <line x1={24} y1={10} x2={24} y2={20} />
        <line x1={40} y1={10} x2={40} y2={20} />
        <circle cx={24} cy={36} r={2.5} />
        <circle cx={32} cy={36} r={2.5} />
        <circle cx={40} cy={36} r={2.5} />
      </>
    );
  }
  if (variant === 'contacts') {
    return (
      <>
        <circle cx={42} cy={20} r={6} />
        <path d="M30 48c0-7 6-12 12-12s12 5 12 12" />
        <circle cx={22} cy={24} r={8} />
        <path d="M8 52c0-10 7-16 14-16s14 6 14 16" />
      </>
    );
  }
  return (
    <>
      <circle cx={32} cy={32} r={13} />
      <rect x={29} y={2} width={6} height={9} rx={1.5} />
      <rect x={29} y={2} width={6} height={9} rx={1.5} transform="rotate(60 32 32)" />
      <rect x={29} y={2} width={6} height={9} rx={1.5} transform="rotate(120 32 32)" />
      <rect x={29} y={2} width={6} height={9} rx={1.5} transform="rotate(180 32 32)" />
      <rect x={29} y={2} width={6} height={9} rx={1.5} transform="rotate(240 32 32)" />
      <rect x={29} y={2} width={6} height={9} rx={1.5} transform="rotate(300 32 32)" />
    </>
  );
}

export default function FooterDOM({ activeTab, labels, bottomInset, onSelect }: FooterDOMProps) {
  const handlePress = (tab: FooterTabKey) => {
    if (tab === activeTab) return;
    void onSelect(tab);
  };

  return (
    <Root>
      <GlobalStyle />
      <Bar style={{ paddingBottom: bottomInset }}>
        {TABS.map((tab) => (
          <TabButton
            key={tab}
            type="button"
            className={tab === activeTab ? 'active' : undefined}
            onClick={() => handlePress(tab)}
            aria-label={labels[tab]}
            aria-current={tab === activeTab ? 'page' : undefined}
          >
            <svg width={26} height={26} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g className="icon-glow">
                <IconShape variant={tab} />
              </g>
              <g className="icon-fg">
                <IconShape variant={tab} />
              </g>
            </svg>
            <span className="tab-label">{labels[tab]}</span>
          </TabButton>
        ))}
      </Bar>
    </Root>
  );
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  background: transparent;
`;

const Bar = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  padding-top: 10px;
  background: #15161a;
  box-shadow:
    inset 0 1px 0 0 rgba(255, 255, 255, 0.08),
    0 -8px 20px -6px rgba(0, 0, 0, 0.6);
`;

const TabButton = styled.button`
  appearance: none;
  border: none;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  padding: 4px 12px;
  cursor: pointer;

  .icon-glow,
  .icon-fg {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .icon-glow > * {
    stroke: #dd2200;
    stroke-width: 8;
    opacity: 0;
    filter: blur(6px);
    transition: opacity 0.3s ease;
  }

  .icon-fg > * {
    stroke: #6b6d72;
    stroke-width: 4;
    transition: stroke 0.3s ease;
  }

  .tab-label {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 10px;
    letter-spacing: 0.3px;
    text-transform: lowercase;
    color: #6b6d72;
    transition: color 0.3s ease;
  }

  &.active .icon-fg > * {
    stroke: #ff5a3c;
    stroke-dasharray: 220;
    stroke-dashoffset: 220;
    animation: iconSweep 2.4s ease-in-out infinite;
    filter: drop-shadow(0 0 3px rgba(221, 34, 0, 0.8));
  }

  &.active .icon-glow > * {
    opacity: 0.55;
    stroke-dasharray: 220;
    stroke-dashoffset: 220;
    animation: iconSweep 2.4s ease-in-out infinite;
  }

  &.active .tab-label {
    color: #ff5a3c;
  }

  @keyframes iconSweep {
    0% {
      stroke-dashoffset: 220;
    }
    50% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: -220;
    }
  }
`;
