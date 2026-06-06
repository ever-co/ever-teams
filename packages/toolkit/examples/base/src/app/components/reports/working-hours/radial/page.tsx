'use client';

import { PageTitle } from '@/components/page-title';
import { TeamsBasicReport, TeamsThemeToggle } from '@ever-teams/atoms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { ComponentExample } from '@/components/component-example';

export default function RadialChartsPage() {
	return (
		<div className="space-y-8">
			<PageTitle title="Radial Charts" description="Collection of Radial Charts in Teams." />

			<Tabs defaultValue="radial" className="w-full">
				<div className="flex items-end justify-between mb-6">
					<TabsList>
						<TabsTrigger value="radial">Radial Chart</TabsTrigger>
						<TabsTrigger value="radar">Radar Chart</TabsTrigger>
					</TabsList>
					<div className="flex  justify-center gap-2 items-center  max-w-sm">
						<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 ">Select theme:</h3>
						<TeamsThemeToggle />
					</div>
				</div>

				<TabsContent value="radial" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ComponentExample
							title="Default Radial Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="radial" />`}
						>
							<TeamsBasicReport type="radial" />
						</ComponentExample>

						<ComponentExample
							title="Bordered Radial Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="radial" variant="bordered" />`}
						>
							<TeamsBasicReport type="radial" variant="bordered" />
						</ComponentExample>
					</div>
				</TabsContent>

				<TabsContent value="radar" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ComponentExample
							title="Default Radar Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="radar" />`}
						>
							<TeamsBasicReport type="radar" />
						</ComponentExample>

						<ComponentExample
							title="Bordered Radar Chart"
							code={`import { TeamsBasicReport } from '@ever-teams/atoms';

<TeamsBasicReport type="radar" variant="bordered" />`}
						>
							<TeamsBasicReport type="radar" variant="bordered" />
						</ComponentExample>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
