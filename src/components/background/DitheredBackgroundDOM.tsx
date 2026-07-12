'use dom';

import React from 'react';
import { createGlobalStyle, styled } from 'styled-components';
// @ts-ignore - `@paper-design/shaders-react` may lack local types depending on the environment setup; ignoring ensures zero compiler blockers.
import { Dithering } from '@paper-design/shaders-react';

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
  seed: number;
  isRecording: boolean;
  activeTab: string;
  themeMode: 'light' | 'dark';
  dom?: import('expo/dom').DOMProps;
}

export default function DitheredBackgroundDOM({
  isRecording,
  activeTab,
  themeMode,
}: DitheredBackgroundDOMProps) {
  let targetOpacity = 0.0;
  if (activeTab === 'capture') {
    targetOpacity = isRecording ? 1.0 : 0.0;
  } else {
    targetOpacity = 0.35;
  }

  const colorBack = themeMode === 'light' ? '#ffffff' : '#000000';
  const colorFront = themeMode === 'light' ? '#00df9a' : '#311fff';

  return (
    <Root style={{ opacity: targetOpacity }} $themeMode={themeMode}>
      <GlobalStyle />
      <Dithering
        width="100%"
        height="100%"
        colorBack={colorBack}
        colorFront={colorFront}
        shape="warp"
        type="2x2"
        size={1.5}
        speed={0.8}
      />
    </Root>
  );
}

const Root = styled.div<{ $themeMode: 'light' | 'dark' }>`
  width: 100%;
  height: 100%;
  background: ${(props) => (props.$themeMode === 'light' ? '#ffffff' : '#000000')};
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease;
`;
