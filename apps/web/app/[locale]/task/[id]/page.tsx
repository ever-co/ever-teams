'use client';

import { useOrganizationTeams, useTeamTasks, useUserProfilePage } from '@app/hooks';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container } from 'lib/components';
import { ArrowLeftIcon } from 'assets/svg';
import { MainLayout } from 'lib/layout';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { fullWidthState } from '@app/stores/fullWidth';
import { useAtomValue } from 'jotai';
import { TaskDetailsComponent } from './component';

const TaskDetails = () => {
	const profile = useUserProfilePage();
	const t = useTranslations();
	const router = useRouter();
	const params = useParams();
	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const { getTaskById, detailedTask: task, getTasksByIdLoading } = useTeamTasks();
	const fullWidth = useAtomValue(fullWidthState);

	const id = params?.id;

	const breadcrumb = [
		{ title: activeTeam?.name || '', href: '/' },
		{
			title: JSON.parse(t('pages.taskDetails.BREADCRUMB')),
			href: `/task/${id}`
		}
	];

	useEffect(() => {
		if (
			router &&
			// If id is passed in query param
			id &&
			// Either no task or task id doesn't match query id
			(!task || (task && task.id !== id)) &&
			!getTasksByIdLoading
		) {
			getTaskById(id as string);
		}
	}, [getTaskById, router, task, getTasksByIdLoading, id]);

	return (
		<MainLayout
			showTimer={!profile.isAuthUser && isTrackingEnabled}
			childrenClassName="bg-white dark:bg-dark--theme"
			mainHeaderSlot={
				<div ref={profile.loadTaskStatsIObserverRef} className="pt-20 pb-4 -mt-8 bg-white dark:bg-dark--theme">
					<Container fullWidth={fullWidth}>
						<div className="flex items-center gap-8">
							<span
								className="cursor-pointer"
								onClick={() => {
									router.replace('/');
								}}
							>
								<ArrowLeftIcon className="w-6 h-6" />
							</span>

							<Breadcrumb paths={breadcrumb} className="text-sm" />
						</div>
					</Container>
				</div>
			}
		>
			<Container fullWidth={fullWidth} className="mt-6 mb-10">
				{task && <TaskDetailsComponent task={task} />}
				{/* <IssueModal task={task} /> */}
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(TaskDetails, { displayName: 'TaskDetails' });
