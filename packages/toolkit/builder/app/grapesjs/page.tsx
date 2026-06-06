'use client'
/** @jsxImportSource theme-ui */
import React, { useEffect, Suspense, useCallback } from 'react';
import { withAuth } from '../../components/auth/with-auth';
import { VisualBuilderHeader } from '../../components/layouts/visual-builder-header';
import { useGrapesjs } from './hooks';
import "../globals.css";
import { Theme, useThemeUI } from 'theme-ui';
import { useTheme as useNextTheme } from 'next-themes';
import { useRouter, useSearchParams } from 'next/navigation';
import { BlockStorageService, BuilderPlatform, Block } from '../blocks/storage/block-storage-service';
import { GrapesJSConfig, isGrapesJSConfig } from '../blocks/storage';
import { TENANT } from '../constants';
// Chart Data
import { chartData } from './components';

// Chart Hooks
import {
  useLineChart,
  useAreaChart,
  useBarChart,
  useTooltipChart,
  useBarChartVertical,
  useRadarChart,
  useRadialChart
} from './components/basic-chart';

// Timer Hooks
import {
  useModernTimer,
  useTimer,
  useTeamsBasic,
  useTimerButton
} from './components/basic-timer';

// Date Hooks
import {
  useDateRanger,
  useDatePicker
} from './components/basic-picker';

// Other Components
import {
  useCalendar,
  // useProgressCircle,
  useMember,
  // useCardTeamsReportDisplayer
} from './components';

import { ExportModalContent } from './types';
import { useCheckbox } from './components/basic-checkbox/hooks';

const BLOCK_COMPONENTS = [
  // Timer Category
  { id: 'basic-timer', label: 'Base Timer', content: `<div data-gjs-type="basic-timer"></div>`, category: 'Timer', image: '/img/time-icon.png' },
  { id: 'basic-timer-modern', label: 'Modern Timer', content: `<div data-gjs-type="basic-timer-modern"></div>`, category: 'Timer', image: '/img/timer.png' },
  { id: 'teams-basic', label: 'Teams basic', content: `<div data-gjs-type="teams-basic"></div>`, category: 'Timer', image: '/img/timer-smal.png' },
  { id: 'data-timer-button', label: 'Button Start', content: `<div data-gjs-type="data-timer-button"></div>`, category: 'Timer', image: '/img/timer-button.png' },

  // Charts Category
  { id: 'basic-areachart', label: 'Area Chart', content: `<div data-gjs-type="basic-areachart"></div>`, category: 'Charts', image: '/img/area_chart.png' },
  { id: 'basic-barchart', label: 'Bar Chart', content: `<div data-gjs-type="basic-barchart"></div>`, category: 'Charts', image: '/img/chart.png' },
  { id: 'basic-chart-vertical', label: 'Bar Chart Vertical', content: `<div data-gjs-type="basic-chart-vertical"></div>`, category: 'Charts', image: '/img/chart.png' },
  { id: 'basic-linechart', label: 'Line Chart', content: `<div data-gjs-type="basic-linechart"></div>`, category: 'Charts', image: '/img/line_chart.png' },
  { id: 'basic-radarchart', label: 'Radar chart', content: `<div data-gjs-type="basic-radarchart"></div>`, category: 'Charts', image: '/img/chart.png' },
  { id: 'basic-radialchart', label: 'Radial chart', content: `<div data-gjs-type="basic-radialchart"></div>`, category: 'Charts', image: '/img/chart.png' },
  { id: 'basic-tooltipchart', label: 'Tooltip Chart', content: `<div data-gjs-type="basic-tooltipchart"></div>`, category: 'Charts', image: '/img/tooltip.png' },

  // Calendar Category
  { id: 'basic-date-ranger', label: 'Date Ranger', content: `<div data-gjs-type="basic-date-ranger"></div>`, category: 'Calendar', image: '/img/date_ranger.png' },
  { id: 'basic-datepicker', label: 'Date Picker', content: `<div data-gjs-type="basic-datepicker"></div>`, category: 'Calendar', image: '/img/date_picker.png' },
  { id: 'basic-calendar', label: 'Calendar', content: `<div data-gjs-type="basic-calendar"></div>`, category: 'Calendar', image: '/img/line_chart.png' },

  // Teams UI Category
  { id: 'basic-member', label: 'Member', content: `<div data-gjs-type="basic-member"></div>`, category: 'Teams UI', image: '/img/member.png' },

  // Form Category
  {
    id: 'basic-checkbox',
    label: 'Checkbox',
    content: `<div data-gjs-type="basic-checkbox"></div>`,
    category: 'Form',
    media: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="24" height="24" rx="5" fill="currentColor"/>
      <path class="checkbox-check" d="M6 12.5L10.5 17L18 9.5" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },

  // Commented out components
  // { id: 'card-teams-report-displayer', label: 'Card', content: `<div data-gjs-type="card-teams-report-displayer"></div>`, category: 'Teams', image: '/img/date_picker.png' },
  // { id: 'basic-progress-circle', label: 'ProgressCircle', content: `<div data-gjs-type="basic-progress-circle"></div>`, category: 'Progress', image: '/img/line_chart.png' },
];

function MainPage() {
  const containerId = 'gjs';
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');
  const tenantId = TENANT.ID;
  const orgId = TENANT.ORG_ID;
  const storageService = React.useMemo(() => new BlockStorageService(), []);
  const [block, setBlock] = React.useState<Block | null>(null);
  const [title, setTitle] = React.useState('GrapesJS Visual Editor');

  const saveComponentsRef = React.useRef<(() => Promise<void>) | null>(null);

  const { editor } = useGrapesjs({
    containerId,
    blockComponents: BLOCK_COMPONENTS,
    onSave: () => saveComponentsRef.current?.()
  });

  const saveComponents = React.useCallback(async () => {
    if (!editor || !block) return;
    try {
      const components = editor.getComponents();
      const htmlString = editor.getHtml();
      const cssString = editor.getCss();

      const config: GrapesJSConfig = {
        components: JSON.stringify(components)
      };

      await storageService.updateBlock(
        { tenantId, orgId },
        block.id,
        { config }
      );
    } catch (error) {
      console.error('Failed to save components:', error);
    }
  }, [editor, block, storageService, tenantId, orgId]);

  React.useEffect(() => {
    saveComponentsRef.current = saveComponents;
  }, [saveComponents]);

  const { theme } = useThemeUI();
  const { theme: themeMode } = useNextTheme();
  const colorMode = themeMode as 'light' | 'dark';

  useEffect(() => {
    if (!id || !editor) return;
    (async () => {
      const { data: blocks } = await storageService.getBlocks({ tenantId, orgId });
      if (!blocks) {
        console.error('No blocks found');
        return;
      }
      const found = blocks.find(b => b.id === id && b.builderPlatform === BuilderPlatform.GrapesJS);
      if (found) {
        setBlock(found);
        setTitle(found.title);
        const config = found.config as GrapesJSConfig;
        if (config.components && editor.setComponents) {
          try {
            const components = JSON.parse(config.components);
            editor.setComponents(components);
          } catch (error) {
            console.error('Failed to parse components:', error);
          }
        }
      }
    })();
  }, [id, editor, storageService, tenantId, orgId]);

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle);
    if (!block) return;
    const { data: updated } = await storageService.updateBlock(
      { tenantId, orgId },
      block.id,
      { title: newTitle }
    );
    setBlock(updated);
  };

  useLineChart({ editor, chartData });
  useTooltipChart({ editor, chartData });
  useBarChart({ editor, chartData });
  useAreaChart({ editor, chartData });
  useBarChartVertical({ editor, chartData });
  useRadarChart({ editor, chartData });
  useRadialChart({ editor, chartData });
  useModernTimer({ editor });
  useTimer({ editor });
  useTeamsBasic({ editor });
  useTimerButton({ editor });
  useDateRanger({ editor });
  useDatePicker({ editor });
  useCalendar({ editor });
  // useProgressCircle({ editor });
  useMember({ editor });
  // useCardTeamsReportDisplayer({ editor });
  useCheckbox({ editor });

  return (
    <div className="flex flex-col h-screen">
      <VisualBuilderHeader
        title={title}
        onTitleChange={handleTitleChange}
        platform="GrapesJS"
      />
      <div className="flex flex-1">
        <div id={containerId} className="w-full h-full border !bg-slate-100"></div>
      </div>
    </div>
  );
}

export default function GrapesJSPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MainPage />
    </Suspense>
  );
}
