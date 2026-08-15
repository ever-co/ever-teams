import { Link } from '@remix-run/react';
import type { MetaFunction, LoaderFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
	TeamsEssentialTimer,
	TeamsModernTimer,
	TeamsLoginDialog,
	TeamsRegistrationForm,
	TeamsDailyActivityDisplayer,
	TeamsWeeklyActivityDisplayer,
	TeamsWorkedProjectDisplayer,
	TeamsProfileForm,
	TeamsTeamCreationForm,
	TeamsTeamsViewer,
	TeamsTeamMembers,
	TeamsPomodoroTimer,
	TeamsDailyWorkedTimeDisplayer,
	TeamsWeeklyWorkedTimeDisplayer,
	TeamsPasswordUpdateForm,
	TeamsAccountDeletionForm,
	TeamsMemberInvitationForm,
	TeamsTeamSetting,
	TeamsMemberInvitationFormDialog,
	TeamsTeamCreationFormDialog,
	TeamsProjectsList,
	TeamsTasksList,
	TeamsAppsUrlList,
	TeamsBasicReport,
	TeamsThemeToggle
} from '@ever-teams/atoms';
import React from 'react';
import { cn } from '@ever-teams/toolkit-ui';

export const meta: MetaFunction = () => [{ title: 'Teams Remix Boilerplate | Components' }];

export const loader: LoaderFunction = async () => {
	return json({
		ENV: {
			NODE_ENV: process.env.NODE_ENV
		}
	});
};

type Demo = { title: string; element: React.ReactNode };
type Cat = { name: string; description?: string; demos?: Demo[] };

const categories: Cat[] = [
	{
		name: 'Timers',
		description: 'Timer widgets and progress indicators',
		demos: [
			{
				title: 'TeamsModernTimer – small default',
				element: <TeamsModernTimer variant="default" size="sm" showProgress={false} expandable={true} />
			},
			{
				title: 'TeamsModernTimer – default with progress',
				element: <TeamsModernTimer variant="default" size="default" showProgress={true} expandable={true} />
			},
			{
				title: 'TeamsModernTimer – large bordered',
				element: <TeamsModernTimer variant="bordered" size="lg" showProgress={false} expandable={true} />
			},
			{
				title: 'TeamsModernTimer – expandable default',
				element: <TeamsModernTimer variant="default" size="default" showProgress={true} expandable={true} />
			},
			{
				title: 'TeamsModernTimer – large bordered expandable',
				element: <TeamsModernTimer variant="bordered" size="lg" showProgress={true} expandable={true} />
			},
			{
				title: 'TeamsModernTimer – full features',
				element: <TeamsModernTimer variant="bordered" size="default" showProgress={true} expandable={true} />
			},
			{
				title: 'TeamsEssentialTimer – default',
				element: <TeamsEssentialTimer progress />
			},
			{
				title: 'TeamsEssentialTimer – thick border',
				element: <TeamsEssentialTimer border="thick" progress />
			},
			{
				title: 'TeamsEssentialTimer – gray rounded',
				element: <TeamsEssentialTimer background="secondary" rounded="small" progress />
			},
			{
				title: 'TeamsEssentialTimer – contained primary',
				element: <TeamsEssentialTimer background="primary" color="destructive" progress />
			},
			{
				title: 'TeamsEssentialTimer – icon + progress',
				element: <TeamsEssentialTimer icon progress />
			},
			{
				title: 'TeamsPomodoroTimer',
				element: <TeamsPomodoroTimer />
			}
		]
	},
	{
		name: 'Activity Displayers',
		description: 'Components for displaying work activity and time tracking',
		demos: [
			{
				title: 'TeamsDailyActivityDisplayer',
				element: <TeamsDailyActivityDisplayer showProgress={true} className="" />
			},
			{
				title: 'TeamsWeeklyActivityDisplayer',
				element: <TeamsWeeklyActivityDisplayer showProgress={true} className="" />
			},
			{
				title: 'TeamsWorkedProjectDisplayer',
				element: <TeamsWorkedProjectDisplayer showProgress={true} className="" />
			},
			{
				title: 'TeamsDailyWorkedTimeDisplayer',
				element: <TeamsDailyWorkedTimeDisplayer showProgress={true} className="" />
			},
			{
				title: 'TeamsWeeklyWorkedTimeDisplayer',
				element: <TeamsWeeklyWorkedTimeDisplayer showProgress={true} className="" />
			}
		]
	},
	{
		name: 'Authentication & User Management',
		description: 'Components for user authentication and profile management',
		demos: [
			{
				title: 'TeamsLoginDialog',
				element: <TeamsLoginDialog trigger="" signupLink="" redirectHandler="" />
			},
			{
				title: 'TeamsRegistrationForm',
				element: <TeamsRegistrationForm signInLink="" redirectHandler="" className="" />
			},
			{
				title: 'TeamsProfileForm',
				element: <TeamsProfileForm className="" />
			},
			{
				title: 'TeamsPasswordUpdateForm',
				element: <TeamsPasswordUpdateForm className="" />
			},
			{
				title: 'TeamsAccountDeletionForm',
				element: <TeamsAccountDeletionForm className="" />
			}
		]
	},
	{
		name: 'Team Management',
		description: 'Components for team creation and management',
		demos: [
			{
				title: 'TeamsTeamCreationForm',
				element: <TeamsTeamCreationForm className="" />
			},
			{
				title: 'TeamsTeamsViewer',
				element: <TeamsTeamsViewer className="" />
			},
			{
				title: 'TeamsTeamMembers',
				element: <TeamsTeamMembers className="" />
			},
			{
				title: 'TeamsMemberInvitationForm',
				element: <TeamsMemberInvitationForm className="" />
			},
			{
				title: 'TeamsTeamSetting',
				element: <TeamsTeamSetting className="" />
			},
			{
				title: 'TeamsMemberInvitationFormDialog',
				element: <TeamsMemberInvitationFormDialog trigger="" className="" />
			},
			{
				title: 'TeamsTeamCreationFormDialog',
				element: <TeamsTeamCreationFormDialog trigger="" className="" />
			}
		]
	},
	{
		name: 'Project & Task Management',
		description: 'Components for managing projects and tasks',
		demos: [
			{
				title: 'TeamsProjectsList',
				element: <TeamsProjectsList className="" variant="" size="" />
			},
			{
				title: 'TeamsTasksList',
				element: <TeamsTasksList className="" variant="" size="" />
			},
			{
				title: 'TeamsAppsUrlList',
				element: <TeamsAppsUrlList className="" variant="" size="" />
			}
		]
	},
	{
		name: 'UI Components',
		description: 'General UI components and utilities',
		demos: [
			{
				title: 'TeamsThemeToggle',
				element: <TeamsThemeToggle className="" size="" />
			},
			{
				title: 'TeamsBasicReport',
				element: <TeamsBasicReport className="" variant="" size="" />
			}
		]
	}
];

export default function ComponentsGallery() {
	const containerClassName = cn(
		'min-h-screen',
		'dark:from-gray-950 dark:via-gray-900 dark:to-gray-950',
		'p-8 space-y-8'
	);

	return (
		<div className={containerClassName}>
			<h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-violet-500 to-fuchsia-500 dark:from-violet-400 dark:to-fuchsia-400 bg-clip-text text-transparent">
				Teams Atoms – Component Gallery
			</h1>

			<p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
				Import any component in your Remix route with
				<code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded mx-1 text-gray-800 dark:text-gray-200">
					import {'{ ComponentName }'} from &apos;@ever-teams/atoms&apos;
				</code>{' '}
				or the specific sub-path shown below.
			</p>

			{categories.map((cat) => (
				<section key={cat.name} className="space-y-4">
					<header>
						<h2 className="text-xl font-semibold border-b border-gray-200 dark:border-gray-700 pb-1 text-gray-800 dark:text-gray-200">
							{cat.name}
						</h2>
						{cat.description && (
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{cat.description}</p>
						)}
					</header>
					{cat.demos ? (
						<div className="grid gap-6 md:grid-cols-2 grid-cols-1">
							{cat.demos.map((d) => (
								<div
									key={d.title}
									className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm space-y-2 bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm hover:shadow-md transition-shadow duration-200"
								>
									<h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">{d.title}</h3>
									{d.element}
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-gray-400 dark:text-gray-500 italic">
							Component previews will be added here.
						</p>
					)}
				</section>
			))}

			<div className="mt-12 text-center">
				<Link
					to="/"
					className="text-sm text-gray-600 dark:text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
				>
					← Back to home
				</Link>
			</div>
		</div>
	);
}
