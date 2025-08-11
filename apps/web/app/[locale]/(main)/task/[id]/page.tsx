'use client';

import { useOrganizationTeams, useTeamTasks, useUserProfilePage } from '@/core/hooks';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Button, Container } from '@/core/components';
import { ArrowLeftIcon } from 'assets/svg';
import { MainLayout } from '@/core/components/layouts/default-layout';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { fullWidthState } from '@/core/stores/common/full-width';
import { useAtomValue } from 'jotai';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { TaskDetailsPageSkeleton } from '@/core/components/common/skeleton/task-details-page-skeleton';
import { DocumentMagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { clsxm } from '@/core/lib/utils';
import Link from 'next/link';

// Import optimized components from centralized location
import { LazyTaskDetailsComponent } from '@/core/components/optimized-components';

const TaskDetails = () => {
	const profile = useUserProfilePage();
	const t = useTranslations();
	const router = useRouter();
	const params = useParams();
	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const { getTaskById, detailedTask, getTasksByIdLoading } = useTeamTasks();
	const fullWidth = useAtomValue(fullWidthState);

	// State to track if we've already tried to load the task
	const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

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
			(!detailedTask || (detailedTask && detailedTask.id !== id)) &&
			!getTasksByIdLoading
		) {
			getTaskById(id as string);
			setHasAttemptedLoad(true);
		}
	}, [getTaskById, router, detailedTask, getTasksByIdLoading, id]);

	// Optimized render logic
	const renderContent = useMemo(() => {
		// If we're loading or haven't tried to load yet
		if ((getTasksByIdLoading || !hasAttemptedLoad) && !detailedTask) {
			return <TaskDetailsPageSkeleton />;
		}

		// If we've finished loading and have a task
		if (detailedTask) {
			return <LazyTaskDetailsComponent task={detailedTask} />;
		}

		// If we've finished loading and don't have a task (after trying)
		return (
			<div
				className={clsxm(
					'flex flex-col items-center justify-center min-h-[400px] p-8 text-center',
					'bg-white dark:bg-dark--theme rounded-xl border border-[#00000014] dark:border-[#26272C]',
					'mt-6 mb-10'
				)}
			>
				<DocumentMagnifyingGlassIcon className="mb-4 w-16 h-16 text-gray-400 dark:text-gray-500" />

				<h2 className="mb-2 text-2xl font-semibold text-gray-900 dark:text-white">Task not found</h2>

				<p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
					The task you are looking for does not exist.
				</p>

				<div className="flex gap-3">
					<Link href="/">
						<Button variant="outline">Go back home</Button>
					</Link>
				</div>
			</div>
		);
	}, [getTasksByIdLoading, hasAttemptedLoad, detailedTask]);

	return (
		<MainLayout
			showTimer={!profile.isAuthUser && isTrackingEnabled}
			childrenClassName="bg-white dark:bg-dark--theme"
			mainHeaderSlot={
				<div ref={profile.loadTaskStatsIObserverRef} className="py-5 bg-white dark:bg-dark--theme">
					<Container fullWidth={fullWidth}>
						<div className="flex gap-8 items-center">
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
				{renderContent}
				{/* <IssueModal task={task} /> */}
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(TaskDetails, { displayName: 'TaskDetails' });
