'use client';

import { useOrganizationTeams, useTeamTasks, useUserProfilePage } from '@app/hooks';
import { ChildIssueCard } from '@components/pages/task/ChildIssueCard';
import { RelatedIssueCard } from '@components/pages/task/IssueCard';
import TaskProperties from '@components/pages/task/TaskProperties';
import RichTextEditor from '@components/pages/task/description-block/task-description-editor';
import TaskDetailsAside from '@components/pages/task/task-details-aside';
import TaskTitleBlock from '@components/pages/task/title-block/task-title-block';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Container } from 'lib/components';
import { ArrowLeft } from 'lib/components/svgs';
import { MainLayout } from 'lib/layout';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

const TaskDetails = () => {
	const profile = useUserProfilePage();
	const t = useTranslations();
	const router = useRouter();
	const { isTrackingEnabled, activeTeam } = useOrganizationTeams();
	const { getTaskById, detailedTask: task, getTasksByIdLoading } = useTeamTasks();

	const breadcrumb = [{ title: activeTeam?.name || '', href: '/' }, ...JSON.parse(t('pages.taskDetails.BREADCRUMB'))];

	useEffect(() => {
		if (
			router.isReady &&
			// If id is passed in query param
			router.query?.id &&
			// Either no task or task id doesn't match query id
			(!task || (task && task.id !== router.query?.id)) &&
			!getTasksByIdLoading
		) {
			getTaskById(router.query?.id as string);
		}
	}, [getTaskById, router, task, getTasksByIdLoading]);

	return (
		<MainLayout
			showTimer={!profile.isAuthUser && isTrackingEnabled}
			childrenClassName="bg-white dark:bg-dark--theme"
		>
			<div className="pt-20 pb-4 -mt-8 bg-white dark:bg-dark--theme">
				<Container>
					<div className="flex items-center gap-8">
						<span
							className="cursor-pointer"
							onClick={() => {
								router.replace('/');
							}}
						>
							<ArrowLeft className="w-6 h-6" />
						</span>

						<Breadcrumb paths={breadcrumb} className="text-sm" />
					</div>
				</Container>
			</div>

			<Container className="mb-10">
				<div className="flex flex-col w-full min-h-screen pt-5">
					<section className="flex flex-col justify-between lg:flex-row lg:items-start 3xl:gap-8">
						<section className="md:mr-5 max-w-[57rem] 3xl:max-w-none xl:w-full mb-4 md:mb-0">
							<TaskTitleBlock />

							<div className="bg-[#F9F9F9] dark:bg-dark--theme-light p-2 md:p-6 pt-0 flex flex-col gap-8 rounded-sm">
								<RichTextEditor />
								{/* <TaskDescriptionBlock /> */}
								<ChildIssueCard />
								<RelatedIssueCard />

								{/* <IssueCard related={true} /> */}

								{/* <CompletionBlock /> */}
								{/* <ActivityBlock /> */}
							</div>
						</section>
						<div className="flex flex-col mt-4 lg:mt-0 3xl:min-w-[24rem] w-full lg:w-[30%]">
							<div className="flex flex-col bg-white dark:bg-dark--theme-light rounded-xl">
								<TaskDetailsAside />
							</div>
							<TaskProperties task={task} />
						</div>
					</section>
				</div>

				{/* <IssueModal task={task} /> */}
			</Container>
		</MainLayout>
	);
};

/**
function IssueModal({ task }: { task: ITeamTask | null }) {
	const { handleStatusUpdate } = useTeamTasks();
	const { trans } = useTranslation();
	const modal = useModal();

	const { openModal } = modal;

	const handleChange = useCallback(
		(status: any) => {
			handleStatusUpdate(status, 'issueType', task);
		},
		[task, handleStatusUpdate]
	);

	useEffect(() => {
		if (
			task?.createdAt &&
			task?.updatedAt &&
			task?.createdAt === task?.updatedAt
		) {
			openModal();
		}
	}, [task?.updatedAt, task?.createdAt, openModal]);

	return (
		<TaskStatusModal
			key={task?.id}
			modal={modal}
			types="issueType"
			title={trans.common.SELECT_ISSUE}
			defaultValue={task?.issueType}
			onValueChange={handleChange}
		>
			<></>
		</TaskStatusModal>
	);
}
 */

export default withAuthentication(TaskDetails, { displayName: 'TaskDetails' });
