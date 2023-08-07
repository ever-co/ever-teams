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
	Tooltip,
	VerticalSeparator,
} from 'lib/components';
import { DraggerIcon, MailIcon, MoreIcon } from 'lib/components/svgs';
import { TimerStatus } from 'lib/features/timer/timer-status';
import { useTranslation } from 'lib/i18n';

type Props = IClassName & { invitation: IInvitation };

export function InvitedCard({ invitation, className }: Props) {
	const { trans } = useTranslation();

	return (
		<div>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative sm:flex hidden items-center py-3',
					className
				)}
			>
				<div className="absolute -left-0 opacity-40">
					<DraggerIcon className="fill-[#CCCCCC] dark:fill-[#4F5662]" />
				</div>

				{/* User info */}
				<div className="flex items-center space-x-4 w-[330px] opacity-40">
					<Avatar
						size={60}
						className="relative"
						imageTitle={invitation.fullName}
					>
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
					<Text>0h : 0m</Text>
				</div>
				<VerticalSeparator />

				{/* TaskEstimateInfo */}
				<div className="opacity-40 flex items-center justify-center space-x-1 w-52 relative">
					{/* <TimeInputField defaultValue="00" label="h" />
					<span>:</span>
					<TimeInputField defaultValue="00" label="m" />
					<div className="absolute inset-0" /> */}
					<Text>0h : 0m</Text>
				</div>
				<VerticalSeparator />

				{/* Card menu */}
				<div className="opacity-40 text-center font-normal flex-1">
					<Text>0h : 0m</Text>
				</div>

				<div className="absolute right-2">
					<RemoveUserInviteMenu invitation={invitation} />
				</div>
			</Card>
			<Card
				shadow="bigger"
				className={clsxm('relative flex sm:hidden py-3 flex-col', className)}
			>
				<div className="flex mb-4 items-center">
					<Avatar
						size={60}
						className="relative mr-2"
						imageTitle={invitation.fullName}
					>
						<TimerStatus
							status={'idle'}
							className="absolute border z-20 bottom-3 -right-1 -mb-3"
						/>
					</Avatar>
					<div className="">
						<Text.Heading as="h3">{invitation.fullName}</Text.Heading>
						<Text className="text-gray-400 flex items-center text-sm space-x-1">
							<MailIcon /> <span>{invitation.email}</span>
						</Text>
					</div>
				</div>
				<div className="flex justify-between items-start pb-4 border-b flex-wrap">
					<Text className="opacity-40 w-80 px-4 ">
						{trans.common.TASK_TITTLE}
					</Text>
				</div>
				<div className="flex justify-between  mt-4 mb-4 space-x-5">
					<div className="flex flex-col">
						<div className="opacity-40 flex items-center space-x-1 text-xs ml-1 mb-2">
							<span>{trans.common.TODAY}:</span>
							<Text>0h : 0m</Text>
						</div>
						<div className="opacity-40 flex items-center space-x-1 text-xs">
							<TimeInputField defaultValue="00" label="h" />
							<span>:</span>
							<TimeInputField defaultValue="00" label="m" />
							<div className="absolute " />
						</div>
					</div>
					<div className="opacity-40 text-end text-xs flex-1">
						<Text>0h : 0m</Text>
					</div>
				</div>
				<div className="absolute right-2">
					<RemoveUserInviteMenu invitation={invitation} />
				</div>
			</Card>
		</div>
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
	active = true,
}: IClassName & { onClick?: () => void; active?: boolean }) {
	const { trans } = useTranslation();

	return (
		<div>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative hidden sm:flex items-center py-3 min-h-[8.75rem] dark:bg-[#1E2025]',
					'dark:border dark:border-[#FFFFFF14]',
					className
				)}
			>
				<div className="opacity-40 absolute -left-0">
					<DraggerIcon className="fill-[#CCCCCC] dark:fill-[#4F5662]" />
				</div>

				<div className="opacity-40 absolute right-2">
					<MoreIcon />
				</div>

				{/* Show user name, email and image */}
				<div className="w-[330px] px-4 flex space-x-3">
					<div className="opacity-40 w-10 h-10 bg-slate-400 rounded-full" />

					<Tooltip
						enabled={!active}
						label={trans.common.VERIFY_ACCOUNT_MSG}
						placement="top-start"
						className="inline-block"
					>
						<Button disabled={!active} onClick={onClick}>
							{trans.common.INVITE}
						</Button>
					</Tooltip>
				</div>
				<VerticalSeparator />

				{/* Task information */}
				<Text className="opacity-40 sm:w-80 px-4 text-center text-xs sm:text-sm">
					{trans.common.TASK_TITTLE}
				</Text>
				<VerticalSeparator className="ml-2" />

				{/* TaskTime */}
				<div className="opacity-40 flex text-center space-x-2 items-center mb-2 sm:w-48 font-normal px-3  text-xs md:text-sm">
					<span>{trans.common.TODAY}:</span>
					<Text>00h : 00m</Text>
				</div>
				<VerticalSeparator />

				{/* TaskEstimateInfo */}
				<div className="opacity-40 flex items-center justify-center space-x-1 sm:w-52 relative text-xs md:text-sm">
					<TimeInputField defaultValue="00" label="h" />
					<span>:</span>
					<TimeInputField defaultValue="00" label="m" />
					<div className="absolute inset-0" />
				</div>
				<VerticalSeparator />

				{/* Card menu */}
				<div className="opacity-40 text-center font-normal flex-1  text-xs md:text-sm">
					<Text>0h : 0m</Text>
				</div>
			</Card>
			<Card
				shadow="bigger"
				className={clsxm('relative sm:hidden flex flex-col py-3', className)}
			>
				<div className="opacity-40 absolute right-2">
					<MoreIcon />
				</div>
				<div className="px-4 flex justify-between">
					<div className="opacity-40 w-10 h-10 bg-slate-400 rounded-full" />
					<Button onClick={onClick}>{trans.common.INVITE}</Button>
				</div>
				<Text className="opacity-40  px-4 text-left mt-4">
					{trans.common.TASK_TITTLE}
				</Text>
				<div className="opacity-40 flex text-center space-x-2 items-center mb-2 mt-4 pt-4 w-full font-normal px-3 border-t text-xs">
					<span>{trans.common.TODAY}:</span>
					<Text>0h : 0m</Text>
				</div>
				<div className="flex items-center justify-between">
					<div className="opacity-40 pl-3 flex items-center justify-center space-x-1 relative text-xs">
						<TimeInputField defaultValue="00" label="h" />
						<span>:</span>
						<TimeInputField defaultValue="00" label="m" />
						<div className="absolute inset-0" />
					</div>
					<div className="opacity-40 text-end font-normal flex-1 text-xs">
						<Text>0h : 0m</Text>
					</div>
				</div>
			</Card>
		</div>
	);
}
