import React, { forwardRef } from 'react';
import { TeamsReportDisplayer } from '@ever-teams/atoms';
import { ThemeUIProvider } from 'theme-ui';
import { defaultTheme, TeamsProvider } from '@ever-teams/atoms';
import { IReportDisplayer } from '../../types';

export const CardTeamsReportDisplayer = forwardRef<HTMLDivElement, IReportDisplayer>((props, ref) => {
  return (
    <div ref={ref}>
      <ThemeUIProvider theme={defaultTheme}>
        <TeamsProvider>
          <TeamsReportDisplayer {...props} />
        </TeamsProvider>
      </ThemeUIProvider>
    </div>
  );
});

CardTeamsReportDisplayer.displayName = 'CardTeamsReportDisplayer';
