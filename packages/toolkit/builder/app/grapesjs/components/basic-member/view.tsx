import React from 'react';
import { renderReactComponentDynamic } from '../../render';
import { ComponentView, ComponentModel } from '../../types';
import { Member } from '@ever-teams/toolkit-types';
import { BasicTeamsMember } from '@ever-teams/atoms';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';

export const memberView: Partial<ComponentView> = {
  tagName: 'div',

  onRender({ el, model }: { el: HTMLElement; model: ComponentModel }) {
    if (!el) return;

    const container = document.createElement('div');
    container.className = 'basic-member-container';
    el.innerHTML = '';
    el.appendChild(container);

    const variant = model.get<'default' | 'bordered'>('variant');
    const size = model.get<'default' | 'sm' | 'lg'>('size') || 'default';

    const values = JSON.parse(model.get('values') || '[]') as Member[];

    const props = {
      title: model.get<string>('title') || 'Members Activities',
      showProgress: Boolean(model.get<boolean>('showProgress')),
      showTime: Boolean(model.get<boolean>('showTime')),
      size: size,
      variant: variant || 'default',
      values: values,
      className: `basic-member-wrapper ${variant === 'bordered' ? 'border-2' : ''}`
    };

    renderReactComponentDynamic(
      <ThemeUIProvider theme={defaultTheme}>
        <TeamsProvider>
          <BasicTeamsMember {...props} />
        </TeamsProvider>
      </ThemeUIProvider>,
      container
    );
  }
};
