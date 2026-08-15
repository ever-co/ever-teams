import React from 'react';
import {
    BasicAreaChart, BasicLineChart, BasicBarChartVertical, BasicBarChart,
    BasicTooltipChart, BasicRadarChart, BasicRadialChart
} from '../../drag-components';

export const chartComponents = [
    {
        label: "Line Chart",
        id: "LineChart",
        component: <BasicLineChart />,
        imageSrc: "/components/line-charts.png"
    },
    {
        label: "Area Chart",
        id: "AreaChart",
        component: <BasicAreaChart type={'area'} className={''} />,
        imageSrc: "/components/area-charts.png"
    },
    {
        label: "Bar Chart",
        id: "BarChart",
        component: <BasicBarChart />,
        imageSrc: "/components/bar-charts.png"
    },
    {
        label: "Bar Chart Vertical",
        id: "BarChartVertical",
        component: <BasicBarChartVertical />,
        imageSrc: "/components/bar-vertical-charts.png"
    },
    {
        label: "Radar Chart",
        id: "RadarChart",
        component: <BasicRadarChart />,
        imageSrc: "/components/radar-charts.png"
    },
    {
        label: "Radial Chart",
        id: "RadialChart",
        component: <BasicRadialChart />,
        imageSrc: "/components/radial-charts.png"
    },
    {
        label: "Tooltip Chart",
        id: "TooltipChart",
        component: <BasicTooltipChart />,
        imageSrc: "/components/tooltip-charts.png"
    }
];
