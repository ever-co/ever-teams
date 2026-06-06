import React from 'react';
import { renderReactComponentDynamic } from '../../../render';
import { BasicDateRanger } from './component';
import { ComponentView, ComponentModel } from '../../../types';

export const dateRangerView: Partial<ComponentView> = {
  tagName: 'div',

  onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
    if (!el) return;

    const container = document.createElement('div');
    container.className = 'date-ranger-container';
    el.innerHTML = '';
    el.appendChild(container);
    
    const props = {
      className: `date-ranger-wrapper`
    };

    renderReactComponentDynamic(
      <BasicDateRanger {...props} />,
      container
    );
  }
}; 
