'use client';

import { PageTitle } from '@/components/page-title';
import { TeamsBasicReport, TeamsThemeToggle } from '@ever-teams/atoms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { ComponentExample } from '@/components/component-example';

export default function BarChartsPage() {
	return (
		<div className="space-y-8">
			<PageTitle title="Bar Charts" description="Collection of Bar Charts Components in Teams." />

			<Tabs defaultValue="vertical" className="w-full">
				<div className="flex items-end justify-between mb-6">
					<TabsList>
						<TabsTrigger value="horizontal">Horizontal Bar</TabsTrigger>
						<TabsTrigger value="vertical">Vertical Bar</TabsTrigger>
					</TabsList>
					<div className="flex  justify-center gap-2 items-center  max-w-sm">
						<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 ">Select theme:</h3>
						<TeamsThemeToggle />
					</div>
				</div>

				<TabsContent value="horizontal" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ComponentExample
							title="Default Horizontal Bar"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="bar-horizontal" />`}
						>
							<TeamsBasicReport type="bar-horizontal" />
						</ComponentExample>

						<ComponentExample
							title="Bordered Horizontal Bar"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="bar-horizontal" variant="bordered" />`}
						>
							<TeamsBasicReport type="bar-horizontal" variant="bordered" />
						</ComponentExample>
					</div>
				</TabsContent>

				<TabsContent value="vertical" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ComponentExample
							title="Default Vertical Bar"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="bar" />`}
						>
							<TeamsBasicReport type="bar" />
						</ComponentExample>

						<ComponentExample
							title="Bordered Vertical Bar"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="bar" variant="bordered" />`}
						>
							<TeamsBasicReport type="bar" variant="bordered" />
						</ComponentExample>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
