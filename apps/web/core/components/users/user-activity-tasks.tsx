import { I_UserProfilePage } from '@/core/hooks';
import { TaskCard } from '../tasks/task-card';
import { I_TaskFilter } from '../pages/profile/task-filters';

type Props = {
	tabFiltered: I_TaskFilter;
	profile: I_UserProfilePage;
};

/**
 * It renders a list of tasks, with the first task being the active task, and the rest being the last
 * 24 hours of tasks
 * @param  - `profile` - The user profile page data.
 * @returns A component that displays a user's profile page.
 */
export function UserProfileTask({ profile, tabFiltered }: Props) {
	const tasks = tabFiltered.tasksFiltered;
	const otherTasks = tasks.filter((t) =>
		profile.member?.running == true ? t.id !== profile.activeUserTeamTask?.id : t
	);

	return (
		<div className="mt-10">
			<ul className="flex flex-col gap-6">
				{otherTasks.map((task) => {
					return (
						<li key={task.id}>
							<TaskCard
								task={task}
								isAuthUser={profile.isAuthUser}
								activeAuthTask={false}
								viewType={tabFiltered.tab === 'unassigned' ? 'unassign' : 'default'}
								profile={profile}
								taskBadgeClassName={`	${
									task.issueType === 'Bug'
										? '!px-[0.3312rem] py-[0.2875rem]'
										: '!px-[0.375rem] py-[0.375rem]'
								} rounded-sm`}
								taskTitleClassName="mt-[0.0625rem]"
							/>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
