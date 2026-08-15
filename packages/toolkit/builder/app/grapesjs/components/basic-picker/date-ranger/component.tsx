import React, { forwardRef } from 'react';
import { TeamsDateRangePicker } from '@ever-teams/atoms';
import { IDateRangePickerProps } from '@ever-teams/toolkit-types';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';

export const BasicDateRanger = forwardRef<HTMLDivElement, Partial<IDateRangePickerProps>>((props, ref) => {
  const defaultProps: IDateRangePickerProps = {
    className: `date-ranger-wrapper`
  };

  return (
    <div ref={ref}>
      <ThemeUIProvider theme={defaultTheme}>
        <TeamsProvider>
          <TeamsDateRangePicker {...defaultProps} />
        </TeamsProvider>
      </ThemeUIProvider>
    </div>
  );
});

BasicDateRanger.displayName = 'BasicDateRanger'; 
