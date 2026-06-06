import React from 'react';
import { Clock, Layout, Grid, BarChart2, Calendar as CalendarIcon, Type } from "lucide-react";

export const SECTION_IDS = {
    TIMER: 'timer-components',
    CHART: 'chart-components',
    DATE: 'date-components',
    TYPOGRAPHY: 'typography-components',
    UI: 'ui-components',
    LAYOUT: 'layout-components'
};

export const sectionConfig = [
    {
        id: SECTION_IDS.TIMER,
        title: "Timer Components",
        icon: <Clock className="w-4 h-4" />,
    },
    {
        id: SECTION_IDS.CHART,
        title: "Chart Components",
        icon: <BarChart2 className="w-4 h-4" />,
    },
    {
        id: SECTION_IDS.DATE,
        title: "Date Components",
        icon: <CalendarIcon className="w-4 h-4" />,
    },
    {
        id: SECTION_IDS.TYPOGRAPHY,
        title: "Typography Components",
        icon: <Type className="w-4 h-4" />,
    },
    {
        id: SECTION_IDS.UI,
        title: "UI Components",
        icon: <Layout className="w-4 h-4" />,
    },
    {
        id: SECTION_IDS.LAYOUT,
        title: "Layout Components",
        icon: <Grid className="w-4 h-4" />,
    }
];
