'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { BasicVariants } from './variants/basic-variants';
import { IconVariants } from './variants/icon-variants';
import { ProgressVariants } from './variants/progress-variants';
import { ButtonVariants } from './variants/button-variants';
import { PageTitle } from '@/components/page-title';
import { TeamsThemeToggle } from '@ever-teams/atoms';

export default function TeamsExtraTimerPage() {
	return (
		<div className="space-y-8">
			<PageTitle
				title="Teams Extra Timer Components"
				description="Collection of Teams Extra Timer Components for building Teams applications."
			/>

			<Tabs defaultValue="basic" className="w-full">
				<div className="flex items-end justify-between">
					<TabsList>
						<TabsTrigger value="basic">Basic Variants</TabsTrigger>
						<TabsTrigger value="icons">With Icons</TabsTrigger>
						<TabsTrigger value="progress">With Progress</TabsTrigger>
						<TabsTrigger value="buttons">With Buttons</TabsTrigger>
					</TabsList>
					<div className="flex  justify-center gap-2 items-center  max-w-sm">
						<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 ">Select theme:</h3>
						<TeamsThemeToggle />
					</div>
				</div>

				<TabsContent value="basic">
					<BasicVariants />
				</TabsContent>

				<TabsContent value="icons">
					<IconVariants />
				</TabsContent>

				<TabsContent value="progress">
					<ProgressVariants />
				</TabsContent>

				<TabsContent value="buttons">
					<ButtonVariants />
				</TabsContent>
			</Tabs>
		</div>
	);
}
