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
	VerticalSeparator
} from 'lib/components';
import { DraggerIcon, MailIcon, MoreIcon } from 'lib/components/svgs';
import { TimerStatus } from 'lib/features/timer/timer-status';
import { useTranslation } from 'next-i18next';

type Props = IClassName & { invitation: IInvitation };

export function InvitedCard({ invitation, className }: Props) {
	const { t } = useTranslation();

	return (
		<div>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative sm:flex hidden items-center py-3 min-h-[7rem] border-[0.1875rem] border-transparent',
					className
				)}
			>
				<div className="absolute -left-0 opacity-40">
					<DraggerIcon className="fill-[#CCCCCC] dark:fill-[#4F5662]" />
				</div>

				{/* User info */}
				<div className="flex items-center space-x-4 2xl:w-[20.625rem] w-1/4 opacity-40">
					<div
						className="'w-[50px] h-[50px]',
					'flex justify-center items-center',
					'rounded-full text-2xl text-default dark:text-white',
					'shadow-md font-normal'"
					>
						{' '}
						<Avatar size={50} className="relative" imageTitle={invitation.fullName}>
							<TimerStatus status={'idle'} className="absolute z-20 -mb-3 border bottom-3 -right-1" />
						</Avatar>
					</div>

					<div className="w-1/2 lg:w-64">
						<Text.Heading
							className="overflow-hidden text-ellipsis whitespace-nowrap lg:max-w-[15ch] xl:max-w-[17ch] 2xl:max-w-full"
							as="h3"
						>
							{invitation.fullName}
						</Text.Heading>
						<Text className="flex items-center space-x-1 text-sm text-gray-400">
							<MailIcon />{' '}
							<span className="overflow-hidden text-ellipsis whitespace-nowrap lg:max-w-[15ch] xl:max-w-[20ch] 2xl:max-w-full">
								{invitation.email}
							</span>
						</Text>
					</div>
				</div>
				<VerticalSeparator />

				{/* Task information */}
				<Text className="w-1/5 px-4 text-center opacity-40 2xl:w-80">{t('common.TASK_TITTLE')}</Text>
				<VerticalSeparator className="ml-2" />

				{/* TaskTime */}
				<div className="flex items-center w-1/5 px-2 mb-2 space-x-2 font-normal text-center opacity-40 2xl:w-48 lg:px-4">
					<span>{t('common.TODAY')}:</span>
					<Text>0h : 0m</Text>
				</div>
				<VerticalSeparator />

				{/* TaskEstimateInfo */}
				<div className="relative flex items-center justify-center w-1/5 space-x-1 opacity-40 2xl:w-52">
					{/* <TimeInputField defaultValue="00" label="h" />
					<span>:</span>
					<TimeInputField defaultValue="00" label="m" />
					<div className="absolute inset-0" /> */}
					<Text>0h : 0m</Text>
				</div>
				<VerticalSeparator />

				{/* Card menu */}
				<div className="flex-1 font-normal text-center opacity-40">
					<Text>0h : 0m</Text>
				</div>

				<div className="absolute right-2">
					<RemoveUserInviteMenu invitation={invitation} />
				</div>
			</Card>
			<Card shadow="bigger" className={clsxm('relative flex sm:hidden py-3 flex-col ', className)}>
				<div className="flex items-center mb-4">
					<Avatar size={50} className="relative mr-2" imageTitle={invitation.fullName}>
						<TimerStatus status={'idle'} className="absolute z-20 -mb-3 border bottom-3 -right-1" />
					</Avatar>
					<div className="">
						<Text.Heading as="h3" className="overflow-hidden text-ellipsis whitespace-nowrap">
							{invitation.fullName}
						</Text.Heading>
						<Text className="flex items-center space-x-1 text-sm text-gray-400">
							<MailIcon />{' '}
							<span className="overflow-hidden text-ellipsis whitespace-nowrap">{invitation.email}</span>
						</Text>
					</div>
				</div>
				<div className="flex flex-wrap items-start justify-between pb-4 border-b">
					<Text className="px-4 opacity-40 w-80 ">{t('common.TASK_TITTLE')}</Text>
				</div>
				<div className="flex justify-between mt-4 mb-4 space-x-5">
					<div className="flex flex-col">
						<div className="flex items-center mb-2 ml-1 space-x-1 text-xs opacity-40">
							<span>{t('common.TODAY')}:</span>
							<Text>0h : 0m</Text>
						</div>
						<div className="flex items-center space-x-1 text-xs opacity-40">
							<TimeInputField defaultValue="00" label="h" />
							<span>:</span>
							<TimeInputField defaultValue="00" label="m" />
							<div className="absolute " />
						</div>
					</div>
					<div className="flex-1 text-xs opacity-40 text-end">
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
	const { t } = useTranslation();
	const { removeInviteLoading, removeTeamInvitation, resendTeamInvitation, resendInviteLoading } =
		useTeamInvitations();

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
											{t('common.RESEND_INVITATION')}
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
												{t('common.REMOVE')}
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
	active = true
}: IClassName & { onClick?: () => void; active?: boolean }) {
	const { t } = useTranslation();

	return (
		<div>
			<Card
				shadow="bigger"
				className={clsxm(
					'relative hidden sm:flex items-center py-3 min-h-[7rem] dark:bg-[#1E2025] border-[0.1875rem] border-transparent',
					'dark:border dark:border-[#FFFFFF14]',
					className
				)}
			>
				<div className="absolute opacity-40 -left-0">
					<DraggerIcon className="fill-[#CCCCCC] dark:fill-[#4F5662]" />
				</div>

				<div className="absolute opacity-40 right-2">
					<MoreIcon />
				</div>

				{/* Show user name, email and image */}
				<div className="2xl:w-[20.625rem] w-1/4 px-4 flex space-x-3">
					<div className="w-10 h-10 rounded-full opacity-40 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-slate-400" />

					<Tooltip
						enabled={!active}
						label={t('common.VERIFY_ACCOUNT_MSG')}
						placement="top-start"
						className="inline-block"
					>
						<Button
							className="min-w-[3.125rem] md:min-w-[5.625rem] lg:min-w-[8.75rem] sm:py-2 sm:px-3 md:py-3 md:px-4"
							disabled={!active}
							onClick={onClick}
						>
							{t('common.INVITE')}
						</Button>
					</Tooltip>
				</div>
				<VerticalSeparator />

				{/* Task information */}
				<Text className="opacity-40 2xl:w-80 3xl:w-[32rem] px-4 text-center text-xs sm:text-sm">
					{t('common.TASK_TITTLE')}
				</Text>
				<VerticalSeparator className="ml-2" />

				{/* TaskTime */}
				<div className="opacity-40 flex text-center space-x-2 items-center mb-2 2xl:w-48 3xl:w-[12rem] w-1/5 font-normal lg:px-4 px-2 text-xs md:text-sm">
					<span>{t('common.TODAY')}:</span>
					<Text>00h : 00m</Text>
				</div>
				<VerticalSeparator />

				{/* TaskEstimateInfo */}
				<div className="relative flex items-center justify-center w-1/5 space-x-1 text-xs opacity-40 2xl:w-52 3xl:w-64 md:text-sm">
					<TimeInputField defaultValue="00" label="h" />
					<span>:</span>
					<TimeInputField defaultValue="00" label="m" />
					<div className="absolute inset-0" />
				</div>
				<VerticalSeparator />

				{/* Card menu */}
				<div className="flex-1 text-xs font-normal text-center opacity-40 md:text-sm">
					<Text>0h : 0m</Text>
				</div>
			</Card>
			<Card shadow="bigger" className={clsxm('relative sm:hidden flex flex-col py-3', className)}>
				<div className="absolute opacity-40 right-2">
					<MoreIcon />
				</div>
				<div className="flex justify-between px-4">
					<div className="w-10 h-10 rounded-full opacity-40 bg-slate-400" />
					<Button onClick={onClick}>{t('common.INVITE')}</Button>
				</div>
				<Text className="px-4 mt-4 text-left opacity-40">{t('common.TASK_TITTLE')}</Text>
				<div className="flex items-center w-full px-3 pt-4 mt-4 mb-2 space-x-2 text-xs font-normal text-center border-t opacity-40">
					<span>{t('common.TODAY')}:</span>
					<Text>0h : 0m</Text>
				</div>
				<div className="flex items-center justify-between">
					<div className="relative flex items-center justify-center pl-3 space-x-1 text-xs opacity-40">
						<TimeInputField defaultValue="00" label="h" />
						<span>:</span>
						<TimeInputField defaultValue="00" label="m" />
						<div className="absolute inset-0" />
					</div>
					<div className="flex-1 text-xs font-normal opacity-40 text-end">
						<Text>0h : 0m</Text>
					</div>
				</div>
			</Card>
		</div>
	);
}
