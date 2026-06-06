'use client';
import { Editor } from '@craftjs/core';
import { Card, CardBottom, CardTop } from './components/drag-components/content/card';
import { Container } from './components/drag-components/layout/container';
import { Text } from './components/drag-components/content/text';
import { BaseTimer } from './components/drag-components/timer/base-timer';
import { Input } from '@ever-teams/toolkit-ui';
import { Button } from './components/drag-components/content/button';
import FlexLayout, { FlexContainer } from './components/drag-components/layout/flex-layout';
import ColLayout, { ColContainer } from './components/drag-components/layout/col-layout';
import GridLayout, { GridContainer } from './components/drag-components/layout/grid-layout';

import { usePathname } from 'next/navigation';
import { Link } from './components/drag-components/content/link';
import { Image } from './components/drag-components/media/image';
import { useAtom, useAtomValue } from 'jotai';
import { motion } from 'framer-motion';
import {
	dragComponents,
	TimerButton,
	TimerProgress,
	BasicDatePicker,
	BasicDateRanger,
	disableAtom,
	RenderNode,
	disableDragAtom,
	dragAtom,
	TeamsModernTimer,
	TeamsEssentialTimerComp,
	SelectDropdownComp,
	CheckBoxComp,
	BasicReport,
	BasicBarChartVertical,
	BasicThemeToggle,
	BasicBarChart,
	BasicAreaChart,
	BasicTooltipChart,
	BasicLineChart,
	BasicRadarChart,
	BasicRadialChart,
	BasicProgressCircle,
	BasicCalendar,
	InputDrag,
	Members
} from './components';

import { ResizableContainer } from './components/resizable-container';
import { ThemeProvider } from './components/components/theme-provider';
import { useAccessToken } from '@ever-teams/atoms';
import { Heading, TextBlockComponent, ParagraphText } from './components/drag-components/';
import { TextareaDrag } from './components/drag-components/form/textarea';
import { ToggleDrag } from './components/drag-components/form/toggle';
import {
	RowLayout as RowComponent,
	ColumnLayout as Column
} from './components/drag-components/layout/row-layout/index';

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	const path = usePathname();
	const [disable, setDisable] = useAtom(disableAtom);
	const [state, setState] = useAtom(dragAtom);
	const { accessToken } = useAccessToken();
	const disableDrag = useAtomValue(disableDragAtom);

	// motion
	const RenderDragComponent = dragComponents?.find((item) => item.id === state.id);
	return (
		<>
			<style>
				{`
					.border {
						border: 1px solid transparent;
					}
				`}
			</style>
			<ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
				<>
					<motion.div
						className="absolute bg-white dark:bg-gray-800 rounded-lg border border-dashed z-[100000]"
						// style={{ top: 0, left: 0 }}
						animate={{
							x: state.x,
							y: state.y,
							opacity: disableDrag && state.id ? 1 : 0
						}}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
					>
						{disableDrag && state.id && RenderDragComponent?.Component()}
					</motion.div>
					<Editor
						enabled={false}
						onRender={RenderNode}
						resolver={{
							BasicBarChartVertical,
							BasicThemeToggle,
							BasicDatePicker,
							BasicDateRanger,
							BasicBarChart,
							BasicAreaChart,
							BasicTooltipChart,
							BasicLineChart,
							BasicRadarChart,
							BasicRadialChart,
							BasicProgressCircle,
							Members,
							BasicCalendar,
							ResizableContainer,
							TimerProgress,
							TimerButton,
							Card,
							Button,
							Image,
							SelectDropdownComp,
							Link,
							CheckBoxComp,
							ParagraphText,
							TeamsModernTimer,
							TeamsEssentialTimerComp,
							BasicReport,
							Input,
							GridLayout,
							GridContainer,
							InputDrag,
							ColLayout,
							ColContainer,
							FlexContainer,
							Text,
							BaseTimer,
							Container,
							CardTop,
							FlexLayout,
							CardBottom,
							Heading,
							TextBlockComponent,
							TextareaDrag,
							ToggleDrag,
							RowComponent,
							Column
						}}
					>
						{children}
					</Editor>
				</>
			</ThemeProvider>
		</>
	);
}
