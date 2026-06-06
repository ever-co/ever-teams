import React from 'react';
import { renderReactComponentDynamic } from '../../../render';
import { TeamsChart } from '@ever-teams/atoms';
import { ComponentView, ComponentModel } from '../../../types';

export const lineChartView: Partial<ComponentView> = {
  tagName: 'div',

  onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
    if (!el) return;

    // Set parent element styles
    el.style.width = '100%';
    el.style.minHeight = '300px';
    el.style.position = 'relative';

    const container = document.createElement('div');
    container.className = 'line-chart-container';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'absolute';
    el.innerHTML = '';
    el.appendChild(container);

    // Add data attributes for export parsing
    el.setAttribute('data-component', 'TeamsChart');
    el.setAttribute('data-type', 'line');

    const props = {
      type: 'line' as const,
      data: model.get('data') || [],
      className: 'line-chart-wrapper',
      style: {
        width: '100%',
        height: '100%',
        minHeight: '300px'
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      renderReactComponentDynamic(
        <TeamsChart {...props} />,
        container
      );
    }, 0);
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
