import React from 'react';
import { renderReactComponentDynamic } from '../../render';
import { CardTeamsReportDisplayer } from './component';
import { ComponentView, ComponentModel } from '../../types';

export const cardView: Partial<ComponentView> = {
  tagName: 'div',
  
  onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
    if (!el) {
      return;
    }
    const time = model.get<number>('time') || 0;
    const user = model.get<string>('user') || 'Unknown User';
    const icon = model.get('icon') || null;
    
    renderReactComponentDynamic(
      <CardTeamsReportDisplayer
        workedTime={time}
        user={user}
        label={''}
        maxWorkHours={8}
      />,
      el
    );
  }
};
