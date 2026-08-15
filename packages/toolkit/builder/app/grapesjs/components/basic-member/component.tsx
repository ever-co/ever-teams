import React, { forwardRef } from 'react';
import { BasicTeamsMember, IBasicTeamsMemberProps } from '@ever-teams/atoms';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';

export const BasicMember = forwardRef<HTMLDivElement, Partial<IBasicTeamsMemberProps>>((props, ref) => {
  const defaultProps: IBasicTeamsMemberProps = {
    title: props.title || 'Members Activities',
    showProgress: props.showProgress || false,
    showTime: props.showTime || false,
    size: props.size || 'default',
    variant: props.variant || 'default',
    values: props.values || [],
    classNameTitle: 'font-bold',
    className: `basic-member-wrapper ${props.variant === 'bordered' ? 'border-2' : ''}`
  };

  return (
    <div ref={ref}>
      <ThemeUIProvider theme={defaultTheme}>
        <TeamsProvider>
          <BasicTeamsMember {...defaultProps} />
        </TeamsProvider>
      </ThemeUIProvider>
    </div>
  );
});

BasicMember.displayName = 'BasicMember'; 
