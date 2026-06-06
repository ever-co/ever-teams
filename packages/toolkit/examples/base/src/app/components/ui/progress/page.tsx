'use client';

import { TeamsProgress, TeamsProgressCircle } from '@ever-teams/atoms';
import { PageTitle } from '@/components/page-title';
import { ComponentExample } from '@/components/component-example';

export default function ProgressVariants() {
	return (
		<div className="space-y-8">
			<PageTitle
				title="Progress Components"
				description="Collection of progress indicators and circle progress components for Teams applications."
			/>

			<div className="grid grid-cols-1 gap-8 p-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<ComponentExample
						title="Teams Progress Circle (Default)"
						code={`import { TeamsProgressCircle } from '@ever-teams/atoms';

<TeamsProgressCircle />`}
					>
						<TeamsProgressCircle />
					</ComponentExample>
					<ComponentExample
						title="Circle Progress Cicle (4 hours worked)"
						code={`import { TeamsProgressCircle } from '@ever-teams/atoms';

<TeamsProgressCircle
  todayTrackedTime={{
    days: 0,
    hours: 4,
    minutes: 0,
    seconds: 0,
    totalSeconds: 14400,
    milliseconds: 0
  }}
/>`}
					>
						<TeamsProgressCircle
							todayTrackedTime={{
								days: 0,
								hours: 4,
								minutes: 0,
								seconds: 0,
								totalSeconds: 14400,
								milliseconds: 0
							}}
						/>
					</ComponentExample>
					<ComponentExample
						title="Teams Progress (Default)"
						code={`import { TeamsProgress } from '@ever-teams/atoms';

<TeamsProgress />`}
					>
						<TeamsProgress
							todayTrackedTime={{
								days: 0,
								hours: 0,
								minutes: 0,
								seconds: 0,
								milliseconds: 0,
								totalSeconds: 5000
							}}
						/>
					</ComponentExample>
				</div>
			</div>
		</div>
	);
}
