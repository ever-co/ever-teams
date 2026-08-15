'use client';

import { PageTitle } from '@/components/page-title';
import { TeamsBasicReport, TeamsAppsUrlList, TeamsTasksList } from '@ever-teams/atoms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { ComponentExample } from '@/components/component-example';

export default function BarChartsPage() {
	return (
		<div className="space-y-8">
			<PageTitle title="Tasks List reports" description="Tasks List Report Component in Teams." />

			<div className="grid grid-cols-1 gap-4">
				<ComponentExample
					title="Component : TeamsTasksList"
					code={`import { TeamsTasksList } from '@ever-teams/atoms';

<TeamsTasksList />`}
				>
					<TeamsTasksList />
				</ComponentExample>
			</div>
		</div>
	);
}
