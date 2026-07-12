'use dom';

import React, { useEffect, useState } from 'react';
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
  const [prevIsActive, setPrevIsActive] = useState(isActive);
  const [shouldRender, setShouldRender] = useState(isActive);
  const [opacity, setOpacity] = useState(isActive ? 1 : 0);

  // Synchronize state during render when props change
  if (isActive !== prevIsActive) {
    setPrevIsActive(isActive);
    if (isActive) {
      setShouldRender(true);
    } else {
      setOpacity(0);
    }
  }

  useEffect(() => {
    if (isActive) {
      // Small frame delay to ensure DOM is updated before setting opacity to 1
      const timer = requestAnimationFrame(() => {
        setOpacity(1);
      });
      return () => cancelAnimationFrame(timer);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  return (
    <Root $opacity={opacity}>
      <GlobalStyle />
      {shouldRender && (
        <Dithering
          width="100%"
          height="100%"
          colorBack="#050505"
          colorFront="#a80000"
          shape="warp"
          type="2x2"
          size={1.5}
          speed={1}
        />
      )}
    </Root>
  );
}

const Root = styled.div<{ $opacity: number }>`
  width: 100%;
  height: 100%;
  background: transparent;
  opacity: ${props => props.$opacity};
  transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
`;
