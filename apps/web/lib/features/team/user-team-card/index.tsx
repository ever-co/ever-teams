import { IClassName } from '@app/interfaces';
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
import { TaskEstimate } from './task-estimate';
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
} & IClassName;

export function UserTeamCard({
	className,
	active,
	userImage = '/assets/profiles/mukesh.png',
	timerStatus = 'running',
	userName = 'Ryan Reynold',
	userEmail = 'RyanR@gmail.com',
}: IUserTeamCard) {
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

			<UserInfo
				userImage={userImage}
				timerStatus={timerStatus}
				userName={userName}
				userEmail={userEmail}
				className="w-[330px]"
			/>
			{/* UserInfo */}
			<VerticalSeparator />

			<TaskInfo className="w-80 px-4" />
			{/* TaskInfo */}
			<VerticalSeparator className="ml-2" />

			<TaskTime className="w-48 px-4" />
			{/* TaskTime */}
			<VerticalSeparator />

			<TaskEstimate className="px-3 w-52" />
			{/* TaskEstimate */}
			<VerticalSeparator />

			<TodayWorkedTime className="flex-1" />
		</Card>
	);
}

export function InviteUserTeamCard({ className }: IClassName) {
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
				<Button>Invite</Button>
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
