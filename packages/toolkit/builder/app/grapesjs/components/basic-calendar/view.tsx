import React from 'react';
import { renderReactComponentDynamic } from '../../render';
import { Calendar } from '@ever-teams/toolkit-ui';
import { ComponentView, ComponentModel } from '../../types';

export const calendarView: Partial<ComponentView> = {
  tagName: 'div',

  onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
    if (!el) return;

    const container = document.createElement('div');
    container.className = 'calendar-container';
    el.innerHTML = '';
    el.appendChild(container);

    const props = {
      showOutsideDays: Boolean(model.get('showOutsideDays'))
    };

    renderReactComponentDynamic(
      <Calendar {...props} />,
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
