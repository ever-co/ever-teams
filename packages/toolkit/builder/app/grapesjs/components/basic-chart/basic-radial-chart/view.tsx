import React from 'react';
import { renderReactComponentDynamic } from '../../../render';
import { TeamsChart } from '@ever-teams/atoms';
import { ComponentView, ComponentModel } from '../../../types';

export const radialChartView: Partial<ComponentView> = {
  tagName: 'div',

  onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
    if (!el) {
      return;
    }
    const container = document.createElement('div');
    container.className = 'radial-chart-container';
    el.innerHTML = '';
    el.appendChild(container);

    // Add data attributes for export parsing
    el.setAttribute('data-component', 'TeamsChart');
    el.setAttribute('data-type', 'radial');

    const props = {
      type: 'radial' as const,
      data: model.get('data') || [],
      className: 'radial-chart-wrapper'
    };

    renderReactComponentDynamic(
      <TeamsChart {...props} />,
      container
    );
  },

  listenToEvents(el: HTMLElement) {
    if (!el) {
      console.error('Element not found for event binding');
      return;
    }
    el.addEventListener('dragend', () => {
      console.log('Drag ended');
    });
  }
};
