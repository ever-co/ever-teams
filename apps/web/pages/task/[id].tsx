import { useTranslation } from 'lib/i18n';
import { Breadcrumb, Container } from 'lib/components';
import { MainLayout } from 'lib/layout';
import {
	useModal,
	useOrganizationTeams,
	useTeamTasks,
	useUserProfilePage,
} from '@app/hooks';
import { withAuthentication } from 'lib/app/authenticator';
import TaskDetailsAside from '@components/pages/task/task-details-aside';
import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRecoilState } from 'recoil';
import { detailedTaskState } from '@app/stores';
// import TaskDescriptionBlock from '@components/pages/task/description-block/task-description-block';
import TaskTitleBlock from '@components/pages/task/title-block/task-title-block';
import { ArrowLeft } from 'lib/components/svgs';
import IssueCard from '@components/pages/task/IssueCard';
import { ITeamTask } from '@app/interfaces';
import { TaskStatusModal } from 'lib/features';
import RichTextEditor from '@components/pages/task/description-block/task-description-editor';
import TaskProperties from '@components/pages/task/TaskProperties';
// import IssueCard from '@components/pages/task/IssueCard';
// import CompletionBlock from '@components/pages/task/CompletionBlock';
// import ActivityBlock from '@components/pages/task/ActivityBlock';

const TaskDetails = () => {
	const profile = useUserProfilePage();
	const { tasks } = useTeamTasks();
	const [task, setTask] = useRecoilState(detailedTaskState);
	const { trans } = useTranslation('taskDetails');
	const router = useRouter();
	const { isTrackingEnabled } = useOrganizationTeams();

	useEffect(() => {
		if (router.isReady && router.query?.id && tasks.length > 0) {
			const foundTask = tasks.find(
				(x) => x.id === (router.query?.id as string)
			);
			// console.log(foundTask);
			foundTask && setTask(foundTask);
		}
	}, [tasks, router.isReady, router.query?.id, setTask]);

	return (
		<MainLayout showTimer={!profile.isAuthUser && isTrackingEnabled}>
			<div className="pt-20 pb-4 -mt-8 bg-white dark:bg-dark--theme">
				<Container>
					<div className="flex items-center gap-8">
						<span
							onClick={() => {
								router.back();
							}}
						>
							<ArrowLeft className="h-6 w-6" />
						</span>

						<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />
					</div>
				</Container>
			</div>

			<Container className="mb-10">
				<div className="flex flex-col w-full min-h-screen pt-5">
					<section className="flex justify-between lg:flex-row flex-col lg:items-start">
						<section className=" md:mr-5 max-w-[900px] xl:w-full mb-4 md:mb-0">
							<TaskTitleBlock />
							<RichTextEditor />
							{/* <TaskDescriptionBlock /> */}
							<IssueCard related={false} />
							{/* <IssueCard related={true} /> */}
							{/* <CompletionBlock /> */}
							{/* <ActivityBlock /> */}
						</section>
						<div className="flex flex-col lg:w-[400px] mt-4 lg:mt-0">
							<div className="bg-white dark:bg-dark--theme-light flex flex-col text-red-700 rounded-xl ">
								<TaskDetailsAside />
							</div>
							<TaskProperties task={task} />
						</div>
					</section>
				</div>

				{/* <IssueModal task={task} /> */}
				{/*<div className="flex sm:justify-end justify-center mt-8">
					<Button
						variant="grey"
						className="font-normal py-4 px-4 rounded-xl text-md mr-8"
					>
						Cancel
					</Button>
					<Button
						variant="primary"
						className="font-normal py-4 px-4 rounded-xl text-md"
						type="submit"
					>
						Save
					</Button>
						</div>*/}
			</Container>
		</MainLayout>
	);
};

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

export default withAuthentication(TaskDetails, { displayName: 'TaskDetails' });
