'use dom';

import React from 'react';
import { styled, createGlobalStyle } from 'styled-components';
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
  if (!isActive) {
    return <Root style={{ backgroundColor: 'transparent' }} />;
  }

  return (
    <Root>
      <GlobalStyle />
      <Dithering
        width="100%"
        height="100%"
        colorBack="#382931"
        colorFront="#a80000"
        shape="warp"
        type="2x2"
        size={2.5}
        speed={1}
      />
    </Root>
  );
}

const Root = styled.div`
  width: 100%;
  height: 100%;
  background: transparent;
`;
