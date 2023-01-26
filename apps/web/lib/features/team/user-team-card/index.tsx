import { useTeamMemberCard, useTMCardTaskEdit } from '@app/hooks';
import { IClassName, IOrganizationTeamList } from '@app/interfaces';
import { clsxm } from '@app/utils';
import {
	Button,
	Card,
	Text,
	TimeInputField,
	VerticalSeparator,
} from 'lib/components';
import { DraggerIcon, MoreIcon } from 'lib/components/svgs';
import { ITimerStatus } from 'lib/features';
import { TaskEstimateInfo } from './task-estimate';
import { TaskInfo } from './task-info';
import { TaskTime, TodayWorkedTime } from './times';
import { UserInfo } from './user-info';

export function UserTeamCardHeader() {
	return (
		<ul className="flex row font-normal justify-between mb-3 mt-16">
			<li>Status</li>
			<li>Name</li>
			<li>Task</li>
			<li>Worked on Task</li>
			<li>Estimate</li>
			<li>Total worked Today</li>
		</ul>
	);
}

type IUserTeamCard = {
	active?: boolean;
	userImage?: string;
	timerStatus?: ITimerStatus;
	userName?: string;
	userEmail?: string;
	member?: IOrganizationTeamList['members'][number];
} & IClassName;

export function UserTeamCard({ className, active, member }: IUserTeamCard) {
	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);

	return (
		<Card
			shadow="bigger"
			className={clsxm(
				'relative flex items-center py-3',
				active && ['border-primary-light border-[2px]'],
				className
			)}
		>
			<div className="absolute -left-0">
				<DraggerIcon />
			</div>

			<div className="absolute right-2">
				<MoreIcon />
			</div>

			{/* Show user name, email and image */}
			<UserInfo memberInfo={memberInfo} className="w-[330px]" />
			<VerticalSeparator />

			{/* Task information */}
			<TaskInfo edition={taskEdition} className="w-80 px-4" />
			<VerticalSeparator className="ml-2" />

			{/* TaskTime */}
			<TaskTime memberInfo={memberInfo} className="w-48 px-4" />
			<VerticalSeparator />

			{/* TaskEstimateInfo */}
			<TaskEstimateInfo
				memberInfo={memberInfo}
				edition={taskEdition}
				className="px-3 w-52"
			/>
			<VerticalSeparator />

			{/* TodayWorkedTime */}
			<TodayWorkedTime memberInfo={memberInfo} className="flex-1" />
		</Card>
	);
}

export function InviteUserTeamCard({
	className,
	onClick,
}: IClassName & { onClick?: () => void }) {
	return (
		<Card
			shadow="bigger"
			className={clsxm('relative flex items-center py-3', className)}
		>
			<div className="opacity-40 absolute -left-0">
				<DraggerIcon />
			</div>

			<div className="opacity-40 absolute right-2">
				<MoreIcon />
			</div>

			<div className="w-[330px] px-4 flex space-x-3">
				<div className="opacity-40 w-10 h-10 bg-slate-400 rounded-full" />
				<Button onClick={onClick}>Invite</Button>
			</div>
			{/* VerticalSeparator */}
			<VerticalSeparator />

			<Text className="opacity-40 w-80 px-4">Task Tittle</Text>
			{/* VerticalSeparator */}
			<VerticalSeparator className="ml-2" />

			<div className="opacity-40 flex text-center space-x-2 items-center mb-2 w-48 font-normal px-3">
				<span>Today:</span>
				<Text>00h : 00m</Text>
			</div>
			{/* VerticalSeparator */}
			<VerticalSeparator />

			<div className="opacity-40 flex items-center justify-center space-x-1 w-52 relative">
				<TimeInputField defaultValue="00" label="h" />
				<span>:</span>
				<TimeInputField defaultValue="00" label="m" />
				<div className="absolute inset-0" />
			</div>
			{/* VerticalSeparator */}
			<VerticalSeparator />

			<div className="opacity-40 text-center font-normal flex-1">
				<Text>00h : 00m</Text>
			</div>
		</Card>
	);
}

export function UserTeamCardSkeleton() {
	return (
		<div
			role="status"
			className="p-4 rounded-xl border divide-y divide-gray-200 shadow animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex justify-between items-center">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-14 h-14 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div>
						<div className="h-3 bg-gray-200 rounded-full dark:bg-gray-700 w-32 mb-2"></div>
					</div>
				</div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-600 w-24"></div>
				<div className="h-2.5 bg-gray-300 rounded-full dark:bg-gray-700 w-24"></div>
			</div>
		</div>
	);
}

export function InviteUserTeamSkeleton() {
	return (
		<div
			role="status"
			className="p-4 mt-3 rounded-xl border divide-y divide-gray-200 shadow animate-pulse dark:divide-gray-700 md:p-6 dark:border-gray-700"
		>
			<div className="flex justify-between items-center">
				<div className="flex items-center space-x-3">
					<div className="w-5 h-5 mr-8 rounded-[50%] bg-gray-200 dark:bg-gray-700"></div>
					<div className="w-24 h-9 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
				</div>
			</div>
		</div>
	);
}
