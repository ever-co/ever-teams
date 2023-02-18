import Image from 'next/image';
import { useTranslation } from 'lib/i18n';
import { Breadcrumb } from 'lib/components';
import { MainLayout } from 'lib/layout';
import { useUserProfilePage } from '@app/hooks';
import { useRecoilState } from 'recoil';
import { detailedTaskState } from '@app/stores';
import { withAuthentication } from 'lib/app/authenticator';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getTaskAPI } from '@app/services/client/api';
import TaskDetailsAside from '@components/pages/task/TaskDetailsAside';

const TaskDetails = () => {
	const profile = useUserProfilePage();
	const { trans } = useTranslation('taskDetails');
	const [task, setTask] = useRecoilState(detailedTaskState);
	const router = useRouter();

	// will be refactored later according to existing practices here.
	useEffect(() => {
		const fetchTask = async () => {
			if (router.isReady) {
				const id = router.query?.id ? (router.query?.id as string) : '';

				const { data: task } = await getTaskAPI(id);
				setTask(task.data);
			}
		};
		fetchTask();
	}, [router.isReady]);

	return (
		<MainLayout
			showTimer={!profile.isAuthUser}
			navbarClassname="relative"
			containerWrapperClassname="pt-0"
		>
			<div className="bg-[#fefefe] px-20 h-[85px] min-w-full flex items-center">
				<Breadcrumb paths={trans.BREADCRUMB} className="text-sm" />
			</div>
			<div className="w-full bg-[#f9f9f9] px-[80px] pt-5 min-h-screen flex flex-col">
				<section className="flex justify-between">
					<section className="mr-5">
						<div className="flex">
							<h1 className="text-black not-italic font-medium text-2xl mr-3 items-start">
								{task?.title}
							</h1>
							<Image
								src="/assets/svg/edit-header-pencil.svg"
								alt="edit header"
								width={32}
								height={32}
								style={{ height: '32px' }}
							/>
						</div>
					</section>
					<div className="bg-white flex flex-col text-red-700 w-[400px] rounded-lg">
						<TaskDetailsAside task={task} />
					</div>
				</section>
			</div>
		</MainLayout>
	);
};

export default withAuthentication(TaskDetails, { displayName: 'TaskDetails' });
