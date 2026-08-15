import React from 'react';
import { renderReactComponentDynamic } from '../../../render';
import { BasicDatePicker } from './component';
import { ComponentView, ComponentModel } from '../../../types';

export const datePickerView: Partial<ComponentView> = {
  tagName: 'div',
  
  onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
    if (!el) return;

    const container = document.createElement('div');
    container.className = 'date-picker-container';
    el.innerHTML = '';
    el.appendChild(container);
    
    // Extract and type-cast values explicitly
    const icon = model.get<boolean>('icon');
    const placeholder = model.get<string>('placeholder');
    
    const props = {
      icon: typeof icon === 'boolean' ? icon : true,
      placeholder: placeholder || 'Pick a date',
      className: 'date-picker-wrapper'
    };

    renderReactComponentDynamic(
      <BasicDatePicker {...props} />,
      container
    );
  }
}; 
