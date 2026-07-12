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
  isActive: boolean;
  dom?: import('expo/dom').DOMProps;
}

export default function DitheredBackgroundDOM({ isActive }: DitheredBackgroundDOMProps) {
  const targetOpacity = isActive ? 1.0 : 0.35;

  return (
    <Root style={{ opacity: targetOpacity }}>
      <GlobalStyle />
      <Dithering
        width="100%"
        height="100%"
        colorBack="#000000"
        colorFront="#311fff"
        shape="warp"
        type="2x2"
        size={1.5}
        speed={0.8}
      />
    </Root>
  );
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  background: #000000;
  transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
`;
