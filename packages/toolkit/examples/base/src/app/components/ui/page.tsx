'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import ButtonVariants from './buttons/page';
import FormVariants from './forms/page';
import ToggleVariants from './toggles/page';
import ProgressVariants from './progress/page';
import MultiSelectVariants from './multiselect/page';

export default function UIComponentsPage() {
	return (
		<div className="space-y-8">
			<h1 className="text-2xl font-bold text-slate-900 dark:text-slate-400">UI Components</h1>
			<div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-800/50 p-3 rounded-lg">
				<p className="text-sm">Collection of UI components for building Teams applications.</p>
			</div>

			<Tabs defaultValue="buttons" className="w-full">
				<TabsList>
					<TabsTrigger value="buttons">Buttons</TabsTrigger>
					<TabsTrigger value="forms">Forms</TabsTrigger>
					<TabsTrigger value="toggles">Toggles</TabsTrigger>
					<TabsTrigger value="multiselect">MultiSelect</TabsTrigger>
					<TabsTrigger value="time">Time Components</TabsTrigger>
					<TabsTrigger value="progress">Circle Progress</TabsTrigger>
				</TabsList>

				<TabsContent value="buttons">
					<ButtonVariants />
				</TabsContent>

				<TabsContent value="forms">
					<FormVariants />
				</TabsContent>

				<TabsContent value="toggles">
					<ToggleVariants />
				</TabsContent>

				<TabsContent value="multiselect">
					<MultiSelectVariants />
				</TabsContent>

				<TabsContent value="progress">
					<ProgressVariants />
				</TabsContent>
			</Tabs>
		</div>
	);
}
