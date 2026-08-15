'use client';

import {
	TeamsTimerForm,
	TeamsLoginForm,
	TeamsRegistrationForm,
	TeamsLoginDialog,
	TeamsRegistrationDialog,
	TeamsThemeToggle,
	useTimer
} from '@ever-teams/atoms';
import { PageTitle } from '@/components/page-title';
import { ComponentExample } from '@/components/component-example';
import { TabsTrigger, Tabs, TabsList, TabsContent } from '@ever-teams/toolkit-ui';

export default function FormVariants() {
	const { currentTeamsState, setCurrentTeamsState, isRunning } = useTimer();
	return (
		<div className="space-y-8">
			<PageTitle
				title="Form Components"
				description="Collection of form components and variants for Teams applications."
			/>

			<Tabs defaultValue="timer" className="w-full">
				<div className="flex items-end justify-between mb-6">
					<TabsList>
						<TabsTrigger value="timer">Timer Form</TabsTrigger>
						<TabsTrigger value="auth">Auth Form</TabsTrigger>
					</TabsList>
					<div className="flex  justify-center gap-2 items-center  max-w-sm">
						<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 ">Select theme:</h3>
						<TeamsThemeToggle />
					</div>
				</div>
				<TabsContent value="timer">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<ComponentExample
							title="Timer Form"
							code={`import { TeamsTimerForm } from '@ever-teams/atoms';

const { currentTeamsState, setCurrentTeamsState, isRunning } = useTimer();

<TeamsTimerForm isTimerRunning={isRunning} currentTeamsState={currentTeamsState} setCurrentTeamsState={setCurrentTeamsState} />`}
						>
							<TeamsTimerForm
								isTimerRunning={isRunning}
								currentTeamsState={currentTeamsState}
								setCurrentTeamsState={setCurrentTeamsState}
							/>
						</ComponentExample>
					</div>
				</TabsContent>
				<TabsContent value="auth">
					<div className="grid grid-cols-1 gap-4">
						<ComponentExample
							title="Login Form"
							code={`import { TeamsLoginForm } from '@ever-teams/atoms';

<TeamsLoginForm />`}
						>
							<TeamsLoginForm className="p-5 max-w-md" />
						</ComponentExample>
						<ComponentExample
							title="Sign Up Form"
							code={`import { TeamsRegistrationForm } from '@ever-teams/atoms';

<TeamsRegistrationForm />`}
						>
							<TeamsRegistrationForm className="p-5 max-w-md" />
						</ComponentExample>
						<ComponentExample
							title="Login Dialog"
							code={`import { TeamsLoginDialog } from '@ever-teams/atoms';

<TeamsLoginDialog />`}
						>
							<TeamsLoginDialog />
						</ComponentExample>
						<ComponentExample
							title="Sign Up Dialog"
							code={`import { TeamsRegistrationDialog } from '@ever-teams/atoms';

<TeamsRegistrationDialog />`}
						>
							<TeamsRegistrationDialog />
						</ComponentExample>
					</div>
				</TabsContent>
			</Tabs>

			<div className="grid grid-cols-1 gap-8 p-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
			</div>
		</div>
	);
}
