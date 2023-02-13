import { useTeamInvitations } from '@app/hooks';
import { IClassName, IInvitation } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Popover, Transition } from '@headlessui/react';
import {
	Avatar,
	Button,
	Card,
	ConfirmDropdown,
	SpinnerLoader,
	Text,
	TimeInputField,
	VerticalSeparator,
} from 'lib/components';
import { DraggerIcon, MailIcon, MoreIcon } from 'lib/components/svgs';
import { TimerStatus } from 'lib/features/timer/timer-status';
import { useTranslation } from 'lib/i18n';

type Props = IClassName & { invitation: IInvitation };

export function InvitedCard({ invitation, className }: Props) {
	const { trans } = useTranslation();

	return (
		<Card
			shadow="bigger"
			className={clsxm('relative flex items-center py-3', className)}
		>
			<div className="absolute -left-0 opacity-40">
				<DraggerIcon />
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
			<Text className="opacity-40 w-80 px-4 text-center">
				{trans.common.TASK_TITTLE}
			</Text>
			<VerticalSeparator className="ml-2" />

			{/* TaskTime */}
			<div className="opacity-40 flex text-center space-x-2 items-center mb-2 w-48 font-normal px-3">
				<span>{trans.common.TODAY}:</span>
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

			<div className="absolute right-2">
				<RemoveUserInviteMenu invitation={invitation} />
			</div>
		</Card>
	);
}

export function RemoveUserInviteMenu({ invitation }: Props) {
	const { trans } = useTranslation();
	const {
		removeInviteLoading,
		removeTeamInvitation,
		resendTeamInvitation,
		resendInviteLoading,
	} = useTeamInvitations();

	const loading = removeInviteLoading || resendInviteLoading;

	return (
		<Popover className="relative">
			{!loading && (
				<Popover.Button className="outline-none">
					<MoreIcon />
				</Popover.Button>
			)}
			{loading && <SpinnerLoader size={20} />}

			<Transition
				enter="transition duration-100 ease-out"
				enterFrom="transform scale-95 opacity-0"
				enterTo="transform scale-100 opacity-100"
				leave="transition duration-75 ease-out"
				leaveFrom="transform scale-100 opacity-100"
				leaveTo="transform scale-95 opacity-0"
				className="absolute z-10 right-0 min-w-[210px]"
			>
				<Popover.Panel>
					{({ close }) => {
						return (
							<Card shadow="custom" className="shadow-xlcard !py-3 !px-4">
								<ul>
									<li>
										<Popover.Button
											onClick={() => resendTeamInvitation(invitation.id)}
											className="font-normal whitespace-nowrap hover:font-semibold hover:transition-all"
										>
											{trans.common.RESEND_INVITATION}
										</Popover.Button>
									</li>
									<li>
										<ConfirmDropdown
											className="right-[110%] top-0"
											onConfirm={() => {
												removeTeamInvitation(invitation.id);
												close();
											}}
										>
											<Text.Div
												className={clsxm(
													'font-normal whitespace-nowrap hover:font-semibold hover:transition-all text-red-500'
												)}
											>
												{trans.common.REMOVE}
											</Text.Div>
										</ConfirmDropdown>
									</li>
								</ul>
							</Card>
						);
					}}
				</Popover.Panel>
			</Transition>
		</Popover>
	);
}

export function InviteUserTeamCard({
	className,
	onClick,
}: IClassName & { onClick?: () => void }) {
	const { trans } = useTranslation();

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
				<Button onClick={onClick}>{trans.common.INVITE}</Button>
			</div>
			<VerticalSeparator />

			{/* Task information */}
			<Text className="opacity-40 w-80 px-4 text-center">
				{trans.common.TASK_TITTLE}
			</Text>
			<VerticalSeparator className="ml-2" />

			{/* TaskTime */}
			<div className="opacity-40 flex text-center space-x-2 items-center mb-2 w-48 font-normal px-3">
				<span>{trans.common.TODAY}:</span>
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
