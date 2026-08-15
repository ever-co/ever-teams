import React from 'react';
import { TeamsBasicTimer as BTeamsTimer, TeamsModernTimer as MTeams, TeamsProgressCircle } from '@ever-teams/atoms';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
	TeamsButton,
	TeamsChart,
	TeamsMember,
	TeamsProgress,
	TeamsThemeToggle,
	TeamsDatePicker,
	TeamsDateRangePicker
} from '@ever-teams/atoms';
import { SelectDropdownDefaultProps } from './_constants/form';
import { Calendar } from '@ever-teams/toolkit-ui';
import Image from 'next/image';
import { TextareaDrag, TextareaDefaultProps } from './form/textarea';
import { ToggleDrag, ToggleDefaultProps } from './form/toggle';
import { TeamsEssentialTimerComp } from './timer/teams-basic-timer';

export * from './report/teams-basic-report';
export * from './content/button';
export * from './content/card';
export * from './form/checkbox';
export * from './layout/col-layout';
export * from './layout/container';
export * from './layout/flex-layout';
export * from './layout/grid-layout';
export * from './layout/row-layout/index';
export * from './media/image';
export * from './form/input';
export * from './content/link';
export * from './content/paragraph';
export * from './content/text';
export * from './timer/timer-button';
export * from './timer/timer-progress';
export * from './date/datepicker';
export * from './date/calendar';
export * from './form/select-box';
export * from './chart';
export * from './theme';
export * from './report/member';
export * from './content/progress-circle';
export * from './content/typography';
export * from './content/text-block';
export * from './content/heading';

export { TeamsEssentialTimerComp } from './timer/teams-basic-timer';
export { BaseTimer } from './timer/base-timer';
export { TeamsModernTimer } from './timer/modern-teams';

export * from './_constants/layout';
export * from './_constants/text';
export * from './_constants/form';
export * from './_constants/media';
export * from './_constants/timer';

export * from './config/common';
export * from './config/text';
export * from './config/form';
export * from './config/media';
export * from './config/timer';

export const dragComponents = [
	{
		id: 'TimerVariantOne',
		category: 'timer',
		Component: () => <MTeams className="w-fit max-w-[300px]" expandable={true} showProgress={false} />
	},
	{
		id: 'TimerVariantTwo',
		category: 'timer',
		Component: () => <TeamsEssentialTimerComp className="w-fit max-w-[300px]" />
	},
	{
		id: 'TimerVairantThree',
		category: 'timer',
		Component: () => <BTeamsTimer className="" background="primary" border="thick" color="secondary" />
	},
	{
		id: 'TimerButton',
		category: 'timer',
		Component: () => (
			<TeamsButton
				isRunning={false}
				startTimer={() => Promise.resolve()}
				stopTimer={() => Promise.resolve()}
				timerLoading={false}
				size={'default'}
			/>
		)
	},
	{
		id: 'TimerProgress',
		category: 'timer',
		Component: () => <TeamsProgress className="" />
	},
	{
		id: 'TeamsBasicReport',
		category: 'visualization',
		Component: () => <Image src="https://i.ibb.co/JQ8WwQ2/image.png" alt="Teams Report" />
	},
	{
		id: 'Chart',
		category: 'visualization',
		Component: () => <TeamsChart type="line" />
	},
	{
		id: 'Text',
		category: 'content',
		Component: () => <p className="w-56 text-lg">Your Title Here</p>
	},
	{
		id: 'Input',
		category: 'form',
		Component: () => (
			<Input placeholder="Your placeholder here" className="border cursor-move h-10 w-56 rounded-md" />
		)
	},
	{
		id: 'Link',
		category: 'content',
		Component: () => (
			<a href="#" className="border cursor-move h-10 w-56 text-blue-600 underline rounded-md">
				https://www.ever.team
			</a>
		)
	},
	{
		id: 'Paragraph',
		category: 'content',
		Component: () => (
			<div className="w-full">
				<p className="text-base text-slate-600 dark:text-slate-400">Paragraph text</p>
			</div>
		)
	},
	{
		id: 'Image',
		category: 'media',
		Component: () => (
			<div className="border cursor-move flex justify-center items-center w-56 h-56 bg-blue-100/20 rounded-md">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256">
					<path
						fill="blue"
						d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16m-60 48a12 12 0 1 1-12 12a12 12 0 0 1 12-12m60 112H40v-39.31l46.34-46.35a8 8 0 0 1 11.32 0L165 181.66a8 8 0 0 0 11.32-11.32l-17.66-17.65L173 138.34a8 8 0 0 1 11.31 0L216 170.07z"
					/>
				</svg>
			</div>
		)
	},
	{
		id: 'CheckBoxComp',
		category: 'form',
		Component: () => (
			<div className="items-top flex space-x-2">
				<Checkbox id="terms1" />
				<div className="grid gap-1.5 leading-none">
					<label
						htmlFor="terms1"
						className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
					>
						Accept terms and conditions
					</label>
					<p className="text-sm text-muted-foreground">
						You agree to our Terms of Service and Privacy Policy.
					</p>
				</div>
			</div>
		)
	},
	{
		id: 'SelectDropdownComp',
		category: 'form',
		Component: () => (
			<Select>
				<div className="relative">
					<div className="absolute h-10 w-24 bg-transparent"></div>
					<SelectTrigger>Select</SelectTrigger>
				</div>
				<SelectContent>
					{SelectDropdownDefaultProps.list.map((option) => (
						<SelectItem key={option.value ?? 'none'} value={option.value ?? 'none'}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		)
	},
	{
		id: 'FlexLayout',
		category: 'layout',
		Component: () => (
			<div className="flex border border-dashed border-gray-600 rounded-md">
				<div className="flex-grow w-24 h-10"></div>
				<div className="flex-grow w-24 h-10 border-x border-dashed border-gray-600"></div>
				<div className="flex-grow w-24 h-10"></div>
			</div>
		)
	},
	{
		id: 'ColLayout',
		category: 'layout',
		Component: () => (
			<div className="flex flex-col border border-dashed border-gray-600 rounded-md">
				<div className="flex-grow w-[288px] h-10 border-gray-600"></div>
				<div className="flex-grow w-[288px] h-10 border-t border-dashed border-gray-600"></div>
				<div className="flex-grow w-[288px] h-10 border-t border-dashed border-gray-600"></div>
			</div>
		)
	},
	{
		id: 'GridLayout',
		category: 'layout',
		Component: () => (
			<div className="grid grid-cols-2 gap-0 w-full border rounded-md border-dashed border-gray-600">
				<div className="h-16 w-36 border-r border-dashed border-gray-600 rounded-tl-md"></div>
				<div className="h-16 w-36"></div>
				<div className="h-16 w-36 border-r border-t rounded-br-md border-gray-600 border-dashed"></div>
				<div className="h-16 w-36 border-t rounded-br-md border-gray-600 border-dashed"></div>
			</div>
		)
	},
	{
		id: 'Container',
		category: 'layout',
		Component: () => <div className="gap-3 w-48 border rounded-md border-collapse border-gray-400 h-40"></div>
	},
	{
		id: 'datepicker',
		category: 'date',
		Component: () => <TeamsDatePicker />
	},
	{
		id: 'daterange',
		category: 'date',
		Component: () => <TeamsDateRangePicker />
	},
	{
		id: 'calendar',
		category: 'date',
		Component: () => <Calendar />
	},
	{
		id: 'theme',
		category: 'utility',
		Component: () => <TeamsThemeToggle />
	},
	{
		id: 'bar',
		category: 'visualization',
		Component: () => <TeamsChart type="bar" />
	},
	{
		id: 'area',
		category: 'visualization',
		Component: () => <TeamsChart type="area" />
	},
	{
		id: 'bar-horizontal',
		category: 'visualization',
		Component: () => <TeamsChart type="bar-horizontal" />
	},
	{
		id: 'line',
		category: 'visualization',
		Component: () => <TeamsChart type="line" />
	},
	{
		id: 'tooltip',
		category: 'visualization',
		Component: () => <TeamsChart type="tooltip" />
	},
	{
		id: 'radar',
		category: 'visualization',
		Component: () => <TeamsChart type="radar" />
	},
	{
		id: 'radial',
		category: 'visualization',
		Component: () => <TeamsChart type="radial" />
	},
	{
		id: 'member',
		category: 'user',
		Component: () => <TeamsMember seconds={0} />
	},
	{
		id: 'circle',
		category: 'visualization',
		Component: () => <TeamsProgressCircle />
	},
	{
		id: 'Heading',
		category: 'content',
		Component: () => (
			<div className="w-full">
				<h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">Heading</h1>
			</div>
		)
	},
	{
		id: 'TextBlock',
		category: 'content',
		Component: () => (
			<div className="w-full">
				<div className="text-base text-slate-600 dark:text-slate-400">Text block content</div>
			</div>
		)
	}
];

export const getComponentsByCategory = (category: string) => {
	return dragComponents.filter((component) => component.category === category);
};

export const componentIds = dragComponents.reduce(
	(acc, component) => {
		acc[component.id] = component.id;
		return acc;
	},
	{} as Record<string, string>
);

export { TextareaDrag, TextareaDefaultProps, ToggleDrag, ToggleDefaultProps };
