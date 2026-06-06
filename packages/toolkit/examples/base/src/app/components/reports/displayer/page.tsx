'use client';

import { PageTitle } from '@/components/page-title';
import {
	TeamsReportDisplayer,
	TeamsDailyActivityDisplayer,
	TeamsDailyWorkedTimeDisplayer,
	TeamsWeeklyActivityDisplayer,
	TeamsWeeklyWorkedTimeDisplayer,
	TeamsWorkedProjectDisplayer,
	TeamsThemeToggle
} from '@ever-teams/atoms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { ComponentExample } from '@/components/component-example';

export default function DisplayerPage() {
	return (
		<div className="space-y-8">
			<PageTitle title="Displayers reports" description="Displayer Components in Teams." />

			<Tabs defaultValue="time" className="w-full">
				<div className="flex items-end justify-between mb-6">
					<TabsList>
						<TabsTrigger value="time">Time Displayer</TabsTrigger>
						<TabsTrigger value="project">Project Displayer</TabsTrigger>
						<TabsTrigger value="activity">Activity Displayer</TabsTrigger>
					</TabsList>
					<div className="flex  justify-center gap-2 items-center  max-w-sm">
						<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 ">Select theme:</h3>
						<TeamsThemeToggle />
					</div>
				</div>

				<TabsContent value="time" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3  items-start gap-4">
						<ComponentExample
							title="Weekly Worked Time Displayer"
							code={`import { TeamsWeeklyWorkedTimeDisplayer } from '@ever-teams/atoms';

							<TeamsWeeklyWorkedTimeDisplayer />`}
						>
							<TeamsWeeklyWorkedTimeDisplayer />
						</ComponentExample>
						<ComponentExample
							title="Daily Worked Time Displayer"
							code={`import { TeamsDailyWorkedTimeDisplayer } from '@ever-teams/atoms';

							<TeamsDailyWorkedTimeDisplayer />`}
						>
							<TeamsDailyWorkedTimeDisplayer />
						</ComponentExample>
					</div>
				</TabsContent>
				<TabsContent value="project" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3  items-start gap-4">
						<ComponentExample
							title="Worked Project Displayer"
							code={`import { TeamsWorkedProjectDisplayer } from '@ever-teams/atoms';

							<TeamsWorkedProjectDisplayer />`}
						>
							<TeamsWorkedProjectDisplayer />
						</ComponentExample>
					</div>
				</TabsContent>
				<TabsContent value="activity" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3  items-start gap-4">
						<ComponentExample
							title="Daily Activity Displayer"
							code={`import { TeamsDailyActivityDisplayer } from '@ever-teams/atoms';

							<TeamsDailyActivityDisplayer />`}
						>
							<TeamsDailyActivityDisplayer />
						</ComponentExample>

						<ComponentExample
							title="Weekly Activity Displayer"
							code={`import { TeamsWeeklyActivityDisplayer } from '@ever-teams/atoms';

							<TeamsWeeklyActivityDisplayer />`}
						>
							<TeamsWeeklyActivityDisplayer />
						</ComponentExample>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
