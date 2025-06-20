import { ITask } from '@/core/types/interfaces/task/task';
import { clsxm } from '@/core/lib/utils';
import { Transition } from '@headlessui/react';
import { SixSquareGridIcon } from 'assets/svg';
import MemberInfo from './member-infos';
import UserTeamActiveTaskInfo from './user-team-active-task';
import UserTeamActiveTaskTimes from './user-team-active-task-times';
import UserTeamActiveTaskEstimate from './user-team-task-estimate';
import UserTeamActiveTaskTodayWorked from './user-team-today-worked';
import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@/core/hooks';
import { useEffect, useState } from 'react';
import { UserTeamCardMenu } from '../../../team/team-members-views/user-team-card/user-team-card-menu';
import { EverCard } from '@/core/components/common/ever-card';
import { VerticalSeparator } from '@/core/components/duplicated-components/separator';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

export default function UserTeamCard({
	member,
	className = 'max-w-full'
}: Readonly<{ member: TOrganizationTeamEmployee; className?: string }>) {
	return (
		<Transition
			as="div"
			show={true}
			enter="transition-opacity duration-75 w-full"
			enterFrom="opacity-0"
			enterTo="opacity-100"
			leave="transition-opacity duration-150"
			leaveFrom="opacity-100"
			leaveTo="opacity-0"
		>
			<EverCard
				shadow="bigger"
				className={clsxm(
					'sm:block hidden transition-all dark:bg-[#1E2025] min-h-[7rem] w-full !py-4',
					'dark:border border border-transparent dark:border-[#FFFFFF14]',
					className
				)}
			>
				<div className="relative flex items-center justify-between w-full m-0">
					<div className="absolute left-0 cursor-pointer w-fit">
						<SixSquareGridIcon className="w-2 max-w-fit text-[#CCCCCC] dark:text-[#4F5662]" />
					</div>
					{/* User information */}
					<div className="relative !w-[27%]">
						<MemberInfo member={member} className="!w-fit" />
					</div>

					<VerticalSeparator />

					{/* Task information */}
					<div className=" !w-[25%]">
						<UserTeamActiveTaskInfo
							member={member}
							className="flex-initial !w-fit !min-w-full !max-w-[280px]"
						/>
					</div>

					<VerticalSeparator />

					{/* Task worked Times */}
					<UserTeamActiveTaskTimes member={member} className=" !w-[15%]" />

					<VerticalSeparator />

					{/* Task estimate Info */}
					<UserTeamActiveTaskEstimate member={member} className=" !w-[20%]" />

					<VerticalSeparator />

					<UserTeamActiveTaskTodayWorked member={member} className="!w-[8%]" />

					{/* EverCard Menu */}
					<div className="absolute right-2">
						<UserActiveTaskMenu member={member} />
					</div>
				</div>
			</EverCard>
		</Transition>
	);
}

function UserActiveTaskMenu({ member }: { member: TOrganizationTeamEmployee }) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTeamTasks();

	useEffect(() => {
		getTaskById(member.activeTaskId || '')
			.then((response) => setActiveTask(response as ITask))
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	return (
		<>
			<UserTeamCardMenu memberInfo={memberInfo} edition={taskEdition} />
		</>
	);
}
