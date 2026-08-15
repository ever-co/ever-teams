import React from 'react';
import { renderReactComponentDynamic } from '../../render';
import { BasicProgressCircle } from './component';
import { ComponentView, ComponentModel } from '../../types';

export const progressCircleView: Partial<ComponentView> = {
  tagName: 'div',
  
  onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
    if (!el) {
      return;
    }
    const strokeWidth = model.get<number>('strokeWidth') || 10;
    const duration = model.get<number>('duration') || 500;
    
    renderReactComponentDynamic(
      <BasicProgressCircle 
        strokeWidth={strokeWidth}
        duration={duration}
      />,
      el
    );
  }
}; 
