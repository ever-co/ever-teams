import React, { forwardRef } from 'react';
import { TeamsProgressCircle, TeamsProgressCircleProps } from '@ever-teams/atoms';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';

export const BasicProgressCircle = forwardRef<HTMLDivElement, TeamsProgressCircleProps>((props, ref) => {
  return (
    <div ref={ref}>
      <ThemeUIProvider theme={defaultTheme}>
        <TeamsProvider>
          <TeamsProgressCircle {...props} />
        </TeamsProvider>
      </ThemeUIProvider>
    </div>
  );
});

BasicProgressCircle.displayName = 'BasicProgressCircle';
