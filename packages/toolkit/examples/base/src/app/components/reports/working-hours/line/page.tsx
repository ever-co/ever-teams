'use client';

import { PageTitle } from '@/components/page-title';
import { TeamsBasicReport, TeamsThemeToggle } from '@ever-teams/atoms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { ComponentExample } from '@/components/component-example';

export default function LineChartsPage() {
	return (
		<div className="space-y-8">
			<PageTitle title="Line Charts" description="Collection of Line Charts Components in Teams." />

			<Tabs defaultValue="line" className="w-full">
				<div className="flex items-end justify-between mb-6">
					<TabsList>
						<TabsTrigger value="line">Line Chart</TabsTrigger>
						<TabsTrigger value="area">Area Chart</TabsTrigger>
						<TabsTrigger value="tooltip">Tooltip Chart</TabsTrigger>
					</TabsList>
					<div className="flex  justify-center gap-2 items-center  max-w-sm">
						<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 ">Select theme:</h3>
						<TeamsThemeToggle />
					</div>
				</div>

				<TabsContent value="line" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ComponentExample
							title="Default Line Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="line" />`}
						>
							<TeamsBasicReport type="line" />
						</ComponentExample>

						<ComponentExample
							title="Bordered Line Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="line" variant="bordered" />`}
						>
							<TeamsBasicReport type="line" variant="bordered" />
						</ComponentExample>
					</div>
				</TabsContent>

				<TabsContent value="area" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ComponentExample
							title="Default Area Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="area" />`}
						>
							<TeamsBasicReport type="area" />
						</ComponentExample>

						<ComponentExample
							title="Bordered Area Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="area" variant="bordered" />`}
						>
							<TeamsBasicReport type="area" variant="bordered" />
						</ComponentExample>
					</div>
				</TabsContent>

				<TabsContent value="tooltip" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ComponentExample
							title="Default Tooltip Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="tooltip" />`}
						>
							<TeamsBasicReport type="tooltip" />
						</ComponentExample>

						<ComponentExample
							title="Bordered Tooltip Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="tooltip" variant="bordered" />`}
						>
							<TeamsBasicReport type="tooltip" variant="bordered" />
						</ComponentExample>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
