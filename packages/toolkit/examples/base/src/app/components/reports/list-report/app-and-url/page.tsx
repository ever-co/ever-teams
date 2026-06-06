'use client';

import { PageTitle } from '@/components/page-title';
import { TeamsAppsUrlList } from '@ever-teams/atoms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { ComponentExample } from '@/components/component-example';

export default function BarChartsPage() {
	return (
		<div className="space-y-8">
			<PageTitle title="Apps and Url reports" description=" Apps and Urls List Component in Teams." />

			<div className="grid grid-cols-1 gap-4">
				<ComponentExample
					title="Component : TeamsAppsUrlList"
					code={`import { TeamsAppsUrlList } from '@ever-teams/atoms';

<TeamsAppsUrlList />`}
				>
					<TeamsAppsUrlList />
				</ComponentExample>
			</div>
		</div>
	);
}
