'use client';

import { PageTitle } from '@/components/page-title';
import { TeamsBasicReport, TeamsAppsUrlList, TeamsProjectsList } from '@ever-teams/atoms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { ComponentExample } from '@/components/component-example';

export default function BarChartsPage() {
	return (
		<div className="space-y-8">
			<PageTitle title="Worked Projects reports" description="Worked Projects List Component in Teams." />

			<div className="grid grid-cols-1 gap-4">
				<ComponentExample
					title="Default Component"
					code={`import { TeamsProjectsList } from '@ever-teams/atoms';

<TeamsProjectsList />`}
				>
					<TeamsProjectsList />
				</ComponentExample>
			</div>
		</div>
	);
}
