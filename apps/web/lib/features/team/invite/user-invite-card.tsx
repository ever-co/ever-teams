import { IClassName, IInvitation } from '@app/interfaces';
import { clsxm } from '@app/utils';
import {
	Avatar,
	Button,
	Card,
	Text,
	TimeInputField,
	VerticalSeparator,
} from 'lib/components';
import { DraggerIcon, MailIcon, MoreIcon } from 'lib/components/svgs';
import { TimerStatus } from 'lib/features/timer/timer-status';

type Props = IClassName & { invitation: IInvitation };

export function InvitedCard({ invitation, className }: Props) {
	return (
		<Card
			shadow="bigger"
			className={clsxm('relative flex items-center py-3', className)}
		>
			<div className="absolute -left-0 opacity-40">
				<DraggerIcon />
			</div>

			<div className="opacity-40 absolute right-2">
				<MoreIcon />
			</div>

			{/* User info */}
			<div className="flex items-center space-x-4 w-[330px] opacity-40">
				<Avatar size={60} className="relative" imageTitle={invitation.fullName}>
					<TimerStatus
						status={'idle'}
						className="absolute border z-20 bottom-3 -right-1 -mb-3"
					/>
				</Avatar>

				<div className="w-64">
					<Text.Heading as="h3">{invitation.fullName}</Text.Heading>
					<Text className="text-gray-400 flex items-center text-sm space-x-1">
						<MailIcon /> <span>{invitation.email}</span>
					</Text>
				</div>
			</div>
			<VerticalSeparator />

			{/* Task information */}
			<Text className="opacity-40 w-80 px-4 text-center">Task Tittle</Text>
			<VerticalSeparator className="ml-2" />

			{/* TaskTime */}
			<div className="opacity-40 flex text-center space-x-2 items-center mb-2 w-48 font-normal px-3">
				<span>Today:</span>
				<Text>00h : 00m</Text>
			</div>
			<VerticalSeparator />

			{/* TaskEstimateInfo */}
			<div className="opacity-40 flex items-center justify-center space-x-1 w-52 relative">
				<TimeInputField defaultValue="00" label="h" />
				<span>:</span>
				<TimeInputField defaultValue="00" label="m" />
				<div className="absolute inset-0" />
			</div>
			<VerticalSeparator />

			{/* Card menu */}
			<div className="opacity-40 text-center font-normal flex-1">
				<Text>00h : 00m</Text>
			</div>
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

			{/* Show user name, email and image */}
			<div className="w-[330px] px-4 flex space-x-3">
				<div className="opacity-40 w-10 h-10 bg-slate-400 rounded-full" />
				<Button onClick={onClick}>Invite</Button>
			</div>
			<VerticalSeparator />

			{/* Task information */}
			<Text className="opacity-40 w-80 px-4 text-center">Task Tittle</Text>
			<VerticalSeparator className="ml-2" />

			{/* TaskTime */}
			<div className="opacity-40 flex text-center space-x-2 items-center mb-2 w-48 font-normal px-3">
				<span>Today:</span>
				<Text>00h : 00m</Text>
			</div>
			<VerticalSeparator />

			{/* TaskEstimateInfo */}
			<div className="opacity-40 flex items-center justify-center space-x-1 w-52 relative">
				<TimeInputField defaultValue="00" label="h" />
				<span>:</span>
				<TimeInputField defaultValue="00" label="m" />
				<div className="absolute inset-0" />
			</div>
			<VerticalSeparator />

			{/* Card menu */}
			<div className="opacity-40 text-center font-normal flex-1">
				<Text>00h : 00m</Text>
			</div>
		</Card>
	);
}
