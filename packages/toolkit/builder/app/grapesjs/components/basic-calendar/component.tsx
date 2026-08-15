import React, { forwardRef } from 'react';
import { Calendar } from '@ever-teams/toolkit-ui';
import { CalendarProps } from '@ever-teams/toolkit-types';

export const BasicCalendar = forwardRef<HTMLDivElement, CalendarProps>((props, ref) => {
  return (
    <div ref={ref}>
      <Calendar {...props} />
    </div>
  );
});

BasicCalendar.displayName = 'BasicCalendar';
