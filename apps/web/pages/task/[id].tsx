import { useTranslation } from 'lib/i18n';
import { Breadcrumb, Container } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { useTeamTasks, useUserProfilePage } from '@app/hooks';
import { withAuthentication } from 'lib/app/authenticator';
import TaskDetailsAside from '@components/pages/task/task-details-aside';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useRecoilState } from 'recoil';
import { detailedTaskState } from '@app/stores';
import TaskDescriptionBlock from '@components/pages/task/task-description-block';
import TaskTitleBlock from '@components/pages/task/task-title-block';

const TaskDetails = () => {
	const profile = useUserProfilePage();
	const { tasks } = useTeamTasks();
	const [task, setTask] = useRecoilState(detailedTaskState);
	const { trans } = useTranslation('taskDetails');
	const router = useRouter();

	console.log(tasks);

	useEffect(() => {
		if (router.isReady && router.query?.id && tasks.length > 0) {
			const foundTask = tasks.find(
				(x) => x.id === (router.query?.id as string)
			);
			foundTask && setTask(foundTask);
		}
	}, [tasks, router.isReady, router.query?.id, setTask]);

	return (
		<MainLayout
			showTimer={!profile.isAuthUser}
			navbarClassname="relative"
			containerWrapperClassname="pt-0"
		>
			<div className="bg-white dark:bg-dark--theme pt-16 -mt-8 pb-4">
				<Container>
					<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />
				</Container>
			</div>

			<Container className="mb-10">
				<div className="w-full pt-5 min-h-screen flex flex-col">
					<section className="flex justify-between">
						<section className="mr-5 max-w-[900px] w-full">
							<TaskTitleBlock title={task?.title} />
							<TaskDescriptionBlock />
						</section>
						<div className="bg-white flex flex-col text-red-700 w-[400px] rounded-lg">
							<TaskDetailsAside />
						</div>
					</section>
				</div>
			</Container>
		</MainLayout>
	);
};

export default withAuthentication(TaskDetails, { displayName: 'TaskDetails' });
