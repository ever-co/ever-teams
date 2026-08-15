import React from 'react';
import { renderReactComponentDynamic } from '../../../render';
import { TeamsBasicTimer } from './component';
import { ComponentView, ComponentModel } from '../../../types';

type BorderType = 'thick' | 'none' | 'thin';
type BackgroundType = 'primary' | 'secondary' | 'destructive';
type ColorType = 'primary' | 'secondary' | 'destructive';
type RoundedType = 'none' | 'small' | 'medium' | 'large';

export const timerView: Partial<ComponentView> = {
  tagName: 'div',

  onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
    if (!el) return;

    const container = document.createElement('div');
    container.className = 'basic-timer-container';
    el.innerHTML = '';
    el.appendChild(container);

    // Add data attributes for export parsing
    el.setAttribute('data-component', 'TeamsBasicTimer');
    el.setAttribute('data-border', model.get('border') || 'thick');
    el.setAttribute('data-background', model.get('background') || 'primary');
    el.setAttribute('data-color', model.get('color') || 'secondary');
    el.setAttribute('data-rounded', model.get('rounded') || 'large');
    el.setAttribute('data-icon', String(model.get('icon') || false));
    el.setAttribute('data-readonly', String(model.get('readonly') || false));

    const props = {
      readonly: Boolean(model.get<boolean>('readonly')),
      border: model.get<BorderType>('border') || 'thick',
      background: model.get<BackgroundType>('background') || 'primary',
      color: model.get<ColorType>('color') || 'secondary',
      rounded: model.get<RoundedType>('rounded') || 'large',
      icon: Boolean(model.get<boolean>('icon')),
      className: 'basic-timer-wrapper'
    };

    renderReactComponentDynamic(
      <TeamsBasicTimer {...props} />,
      container
    );
  }
};
