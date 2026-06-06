'use client';

import { TeamsButton, TeamsThemeToggle, useTimer } from '@ever-teams/atoms';
import { PageTitle } from '@/components/page-title';
import { ComponentExample } from '@/components/component-example';

export default function ButtonVariants() {
	const { isRunning, startTimer, stopTimer, timerLoading, todayTrackedTime } = useTimer();
	return (
		<div className="space-y-8">
			<PageTitle
				title="Button Components"
				description="Collection of button variants and styles for Teams applications."
			/>

			<div className="flex flex-col justify-start mb-4 max-w-sm">
				<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">Select component theme:</h3>
				<TeamsThemeToggle />
			</div>

			<div className="grid grid-cols-1 gap-8 p-4">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<ComponentExample
						title="Large Button"
						code={`import { TeamsButton } from '@ever-teams/atoms';

const { isRunning, startTimer, stopTimer, timerLoading, todayTrackedTime } = useTimer();

<TeamsButton isRunning={isRunning} startTimer={startTimer} stopTimer={stopTimer} timerLoading={timerLoading} size={'lg'} />`}
					>
						<TeamsButton
							isRunning={isRunning}
							startTimer={startTimer}
							stopTimer={stopTimer}
							timerLoading={timerLoading}
							size={'lg'}
						/>
					</ComponentExample>

					<ComponentExample
						title="Default Button"
						code={`import { TeamsButton } from '@ever-teams/atoms';

const { isRunning, startTimer, stopTimer, timerLoading, todayTrackedTime } = useTimer();

<TeamsButton isRunning={isRunning} startTimer={startTimer} stopTimer={stopTimer} timerLoading={timerLoading}>`}
					>
						<TeamsButton
							isRunning={isRunning}
							startTimer={startTimer}
							stopTimer={stopTimer}
							timerLoading={timerLoading}
						/>
					</ComponentExample>

					<ComponentExample
						title="Small Button"
						code={`import { TeamsButton } from '@ever-teams/atoms';

const { isRunning, startTimer, stopTimer, timerLoading, todayTrackedTime } = useTimer();

<TeamsButton isRunning={isRunning} startTimer={startTimer} stopTimer={stopTimer} timerLoading={timerLoading} size={'sm'} />`}
					>
						<TeamsButton
							isRunning={isRunning}
							startTimer={startTimer}
							stopTimer={stopTimer}
							timerLoading={timerLoading}
							size={'sm'}
						/>
					</ComponentExample>
				</div>
			</div>
		</div>
	);
}
