'use client';

import { TeamsThemeToggle } from '@ever-teams/atoms';
import { Tabs, TabsContent, TabsList, TabsListThemed, TabsTrigger } from '@ever-teams/toolkit-ui';
import { BasicVariants } from './variants/basic-variants';
import { ProgressVariants } from './variants/progress-variants';
import { ExpandedVariants } from './variants/expanded-variants';
import { PageTitle } from '@/components/page-title';

export default function TeamsModernTimerPage() {
	return (
		<div className="space-y-8">
			<PageTitle
				title="Teams Modern Timer Components"
				description="Teams Modern timer components with enhanced visual design and functionality."
			/>

			<Tabs defaultValue="basic" className="w-full">
				<div className="flex items-end justify-between">
					<TabsList>
						<TabsTrigger value="basic">Basic Variants</TabsTrigger>
						<TabsTrigger value="progress">With Progress</TabsTrigger>
						<TabsTrigger value="expanded">Expandable</TabsTrigger>
					</TabsList>
					<div className="flex  justify-center gap-2 items-center  max-w-sm">
						<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 ">Select theme:</h3>
						<TeamsThemeToggle />
					</div>
				</div>

				<TabsContent value="basic">
					<BasicVariants />
				</TabsContent>

				<TabsContent value="progress">
					<ProgressVariants />
				</TabsContent>

				<TabsContent value="expanded">
					<ExpandedVariants />
				</TabsContent>
			</Tabs>
		</div>
	);
}
