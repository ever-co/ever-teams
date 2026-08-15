import React, { forwardRef } from 'react';
import { TeamsDatePicker } from '@ever-teams/atoms';
import { IDatePickerProps } from '@ever-teams/toolkit-types';
import { ThemeUIProvider } from 'theme-ui';
import { TeamsProvider, defaultTheme } from '@ever-teams/atoms';

export const BasicDatePicker = forwardRef<HTMLDivElement, Partial<IDatePickerProps>>((props, ref) => {
  // Ensure we're properly handling boolean values
  const icon = typeof props.icon === 'boolean' ? props.icon : true;
  const placeholder = props.placeholder || 'Pick a date';
  const className = props.className || '';

  const defaultProps: IDatePickerProps = {
    icon,
    placeholder,
    className: `date-picker-wrapper ${className}`.trim()
  };

  return (
    <div ref={ref}>
      <ThemeUIProvider theme={defaultTheme}>
        <TeamsProvider>
          <TeamsDatePicker {...defaultProps} />
        </TeamsProvider>
      </ThemeUIProvider>
    </div>
  );
});

BasicDatePicker.displayName = 'BasicDatePicker'; 
