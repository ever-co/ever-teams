import { ITeamTask, OT_Member } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Transition } from '@headlessui/react';
import { SixSquareGridIcon } from 'assets/svg';
import { Card, VerticalSeparator } from 'lib/components';
import MemberInfo from './member-infos';
import UserTeamActiveTaskInfo from './user-team-active-task';
import UserTeamActiveTaskTimes from './user-team-active-task-times';
import UserTeamActiveTaskEstimate from './user-team-task-estimate';
import UserTeamActiveTaskTodayWorked from './user-team-today-worked';
import { UserTeamCardMenu } from 'lib/features/team/user-team-card/user-team-card-menu';
import { useTeamMemberCard, useTeamTasks, useTMCardTaskEdit } from '@app/hooks';
import { useEffect, useState } from 'react';

export default function UserTeamCard({
	member,
	className = 'max-w-full'
}: Readonly<{ member: OT_Member; className?: string }>) {
	return (
		<Transition
			show={true}
			enter="transition-opacity duration-75 w-full"
			enterFrom="opacity-0"
			enterTo="opacity-100"
			leave="transition-opacity duration-150"
			leaveFrom="opacity-100"
			leaveTo="opacity-0"
		>
			<Card
				shadow="bigger"
				className={clsxm(
					'sm:block hidden transition-all dark:bg-[#1E2025] min-h-[7rem] w-full !py-4',
					'dark:border border border-transparent dark:border-[#FFFFFF14]',
					className
				)}
			>
				<div className="relative flex items-center w-full m-0">
					<div className="absolute left-0 cursor-pointer w-fit">
						<SixSquareGridIcon className="w-2 max-w-fit text-[#CCCCCC] dark:text-[#4F5662]" />
					</div>
					{/* User information */}
					<div className="relative w-fit">
						<MemberInfo member={member} className="!w-fit" />
					</div>

					<VerticalSeparator />

					{/* Task information */}
					<div className="flex items-center justify-between flex-initial w-fit min-w-fit">
						<UserTeamActiveTaskInfo
							member={member}
							className="flex-initial !w-fit !min-w-full !max-w-[280px]"
						/>
					</div>

					<VerticalSeparator className="ml-2" />

					{/* Task worked Times */}
					<UserTeamActiveTaskTimes member={member} className="!w-fit max-w-fit" />

					<VerticalSeparator />

					{/* Task estimate Info */}
					<UserTeamActiveTaskEstimate member={member} className="!w-fit" />

					<VerticalSeparator />

					<UserTeamActiveTaskTodayWorked member={member} className="!w-fit !max-w-fit" />

					{/* Card Menu */}
					<div className="absolute hidden right-2">
						<UserActiveTaskMenu member={member} />
					</div>
				</div>
			</Card>
		</Transition>
	);
}

function UserActiveTaskMenu({ member }: { member: OT_Member }) {
	const memberInfo = useTeamMemberCard(member);
	const [activeTask, setActiveTask] = useState<ITeamTask | null | undefined>(null);
	const taskEdition = useTMCardTaskEdit(activeTask);

	const { getTaskById } = useTeamTasks();

	useEffect(() => {
		getTaskById(member.activeTaskId || '')
			.then((response) => setActiveTask(response.data))
			.catch((_) => console.log(_));

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	return (
		<>
			<UserTeamCardMenu memberInfo={memberInfo} edition={taskEdition} />
		</>
	);
}
