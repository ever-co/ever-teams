import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { ConfirmationModal } from './confirmation-modal';
import { ThreeCircleOutlineHorizontalIcon } from 'assets/svg';
import { useAuthenticateUser } from '@/core/hooks/auth';
import {
	useEmployeeUpdate,
	useOrganizationTeams,
	useTeamMemberCard,
	useTMCardTaskEdit
} from '@/core/hooks/organizations';
import { useModal } from '@/core/hooks/common';
import { useRoles } from '@/core/hooks/roles';
import { useDropdownAction } from '../pages/teams/team/team-members-views/user-team-card/user-team-card-menu';
import { RoleNameEnum } from '@/core/types/enums/role';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';

type Props = {
	member: IOrganizationTeamEmployee;
	handleEdit?: (member: IOrganizationTeamEmployee) => void;
	status?: 'settings' | 'profile';
};
/**
 *
 *
 */
export const TableActionPopover = ({ member, handleEdit, status }: Props) => {
	// const [isOpen, setIsOpen] = useState(false);
	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const { activeTeamManagers } = useOrganizationTeams();

	const memberInfo = useTeamMemberCard(member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);
	const { onRemoveMember } = useDropdownAction({
		edition: taskEdition,
		memberInfo
	});
	const { isLoading, updateEmployee } = useEmployeeUpdate();

	const { isOpen, openModal, closeModal } = useModal();

	const isCurrentUser = user?.employee?.id === memberInfo.member?.employeeId;
	const isManager = activeTeamManagers.findIndex((member) => member.employee?.user?.id === user?.id);
	// const handleClick = () => {
	// 	setIsOpen(!isOpen);
	// };
	return (
		<Popover className="relative w-full no-underline border-none">
			{() => (
				<>
					<Transition
						as="div"
						enter="transition ease-out duration-200"
						enterFrom="opacity-0 translate-y-1"
						enterTo="opacity-100 translate-y-0"
						leave="transition ease-in duration-150"
						leaveFrom="opacity-100 translate-y-0"
						leaveTo="opacity-0 translate-y-1"
					>
						<PopoverPanel
							className={`z-10 absolute ${status === 'profile' ? 'left-10' : 'right-10'} bg-white rounded-2xl w-[13.5rem] flex flex-col pl-5 pr-5 pt-2 pb-2 shadow-xl card dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33]`}
						>
							{/* TODO Dynamic */}
							{/* Edit */}
							{status === 'settings' && (
								<div
									className="flex items-center w-auto h-8 hover:cursor-pointer"
									onClick={() => {
										handleEdit && handleEdit(member);
									}}
								>
									<span className="text-[#282048] text-xs font-semibold dark:text-white">
										{t('common.EDIT')}
									</span>
								</div>
							)}

							{/* TODO Dynamic */}
							{/* Change Role */}
							{/* <div className="flex items-center w-auto h-8 hover:cursor-pointer">
								<span className="text-[#282048] text-xs font-semibold dark:text-white">
									Change Role
								</span>
							</div> */}
							<RolePopover />
							{isManager !== -1 && member.role?.name !== RoleNameEnum.MANAGER && (
								<div className="flex items-center justify-between gap-x-2">
									<span>Time tracking</span>
									<div
										className={`w-16 h-6 flex items-center   bg-[#6c57f4b7] rounded-full p-1 cursor-pointer `}
										onClick={() => {
											updateEmployee({
												data: {
													isTrackingEnabled: !member.employee?.isTrackingEnabled,
													id: member.employee?.id || '',
													organizationId: member.employee?.organizationId,
													isActive: member.employee?.isActive,
													tenantId: member.employee?.tenantId
												},
												id: member.employee?.id ?? ''
											});
										}}
										style={
											member.employee?.isTrackingEnabled
												? { background: 'linear-gradient(to right, #ea31244d, #ea312479)' }
												: { background: '#2ead805b' }
										}
									>
										<div
											className={` ${member.employee?.isTrackingEnabled ? 'bg-[#ea3124]' : 'bg-[#2ead81]'} w-4 h-4 rounded-full shadow-md transform transition-transform ${member.employee?.isTrackingEnabled ? 'translate-x-9' : 'translate-x-0'}`}
										>
											{!isLoading &&
												renderTrackingIcon(member.employee?.isTrackingEnabled ?? false)}

											{isLoading ? (
												<svg
													className="animate-spin"
													width="15"
													height="15"
													viewBox="0 0 15 15"
													fill="none"
													xmlns="http://www.w3.org/2000/svg"
												>
													<path
														d="M1.90321 7.29677C1.90321 10.341 4.11041 12.4147 6.58893 12.8439C6.87255 12.893 7.06266 13.1627 7.01355 13.4464C6.96444 13.73 6.69471 13.9201 6.41109 13.871C3.49942 13.3668 0.86084 10.9127 0.86084 7.29677C0.860839 5.76009 1.55996 4.55245 2.37639 3.63377C2.96124 2.97568 3.63034 2.44135 4.16846 2.03202L2.53205 2.03202C2.25591 2.03202 2.03205 1.80816 2.03205 1.53202C2.03205 1.25588 2.25591 1.03202 2.53205 1.03202L5.53205 1.03202C5.80819 1.03202 6.03205 1.25588 6.03205 1.53202L6.03205 4.53202C6.03205 4.80816 5.80819 5.03202 5.53205 5.03202C5.25591 5.03202 5.03205 4.80816 5.03205 4.53202L5.03205 2.68645L5.03054 2.68759L5.03045 2.68766L5.03044 2.68767L5.03043 2.68767C4.45896 3.11868 3.76059 3.64538 3.15554 4.3262C2.44102 5.13021 1.90321 6.10154 1.90321 7.29677ZM13.0109 7.70321C13.0109 4.69115 10.8505 2.6296 8.40384 2.17029C8.12093 2.11718 7.93465 1.84479 7.98776 1.56188C8.04087 1.27898 8.31326 1.0927 8.59616 1.14581C11.4704 1.68541 14.0532 4.12605 14.0532 7.70321C14.0532 9.23988 13.3541 10.4475 12.5377 11.3662C11.9528 12.0243 11.2837 12.5586 10.7456 12.968L12.3821 12.968C12.6582 12.968 12.8821 13.1918 12.8821 13.468C12.8821 13.7441 12.6582 13.968 12.3821 13.968L9.38205 13.968C9.10591 13.968 8.88205 13.7441 8.88205 13.468L8.88205 10.468C8.88205 10.1918 9.10591 9.96796 9.38205 9.96796C9.65819 9.96796 9.88205 10.1918 9.88205 10.468L9.88205 12.3135L9.88362 12.3123C10.4551 11.8813 11.1535 11.3546 11.7585 10.6738C12.4731 9.86976 13.0109 8.89844 13.0109 7.70321Z"
														fill="currentColor"
														fillRule="evenodd"
														clipRule="evenodd"
													></path>
												</svg>
											) : null}
										</div>
									</div>
								</div>
							)}

							{/* TODO Dynamic */}
							{/* Need to integrate with API */}
							{/* Permission */}
							{/* <div className="flex items-center w-auto h-8 hover:cursor-pointer">
								<Link href={'/permissions'}>
									<span className="text-[#282048] text-xs font-semibold dark:text-white">
										Permission
									</span>
								</Link>
							</div> */}

							{/* Delete */}
							{status === 'settings' && (
								<div
									className={`flex items-center h-8 w-auto ${
										!isCurrentUser ? 'hover:cursor-pointer' : ''
									}`}
									onClick={isCurrentUser ? () => undefined : () => openModal()}
								>
									<span className={`${!isCurrentUser ? 'text-[#E27474]' : ''} text-xs font-semibold`}>
										{t('common.DELETE')}
									</span>
								</div>
							)}
						</PopoverPanel>
					</Transition>
					{(status === 'settings' ||
						(status === 'profile' && isManager !== -1 && member.role?.name !== RoleNameEnum.MANAGER)) && (
						<PopoverButton className="w-full mt-2 outline-none">
							<ThreeCircleOutlineHorizontalIcon
								className="w-6 text-[#292D32] relative dark:text-white"
								strokeWidth="2.5"
							/>
						</PopoverButton>
					)}
					<ConfirmationModal
						open={isOpen}
						close={closeModal}
						title={t('pages.settings.ARE_YOU_SURE_TO_DELETE_USER')}
						loading={false}
						onAction={isCurrentUser ? () => undefined : () => onRemoveMember({})}
					/>
				</>
			)}
		</Popover>
	);
};

const RolePopover = () => {
	const { roles } = useRoles();

	return (
		<Popover className="relative w-full no-underline border-none">
			<Transition
				as="div"
				enter="transition ease-out duration-200"
				enterFrom="opacity-0 translate-y-1"
				enterTo="opacity-100 translate-y-0"
				leave="transition ease-in duration-150"
				leaveFrom="opacity-100 translate-y-0"
				leaveTo="opacity-0 translate-y-1"
			>
				<PopoverPanel
					className="z-10 absolute right-0 bg-white dark:bg-[#202023] rounded-2xl w-[9.5rem] flex flex-col pl-5 pr-5 pt-2 pb-2 mt-10 mr-10"
					style={{ boxShadow: ' rgba(0, 0, 0, 0.12) -24px 17px 49px' }}
				>
					{roles.map((role) => (
						<div className="flex items-center w-auto h-8 hover:cursor-pointer" key={role.id}>
							<span className="text-[#282048] text-xs font-semibold dark:text-white">{role.name}</span>
						</div>
					))}
				</PopoverPanel>
			</Transition>
			{/* <Popover.Button className="flex items-center w-auto h-8 outline-none hover:cursor-pointer">
				<span className="text-[#282048] text-xs font-semibold dark:text-white">
					Change Role
				</span>
			</Popover.Button> */}
		</Popover>
	);
};

export const renderTrackingIcon = (isTrackingEnabled: boolean) => {
	return isTrackingEnabled ? (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M12.8536 2.85355C13.0488 2.65829 13.0488 2.34171 12.8536 2.14645C12.6583 1.95118 12.3417 1.95118 12.1464 2.14645L7.5 6.79289L2.85355 2.14645C2.65829 1.95118 2.34171 1.95118 2.14645 2.14645C1.95118 2.34171 1.95118 2.65829 2.14645 2.85355L6.79289 7.5L2.14645 12.1464C1.95118 12.3417 1.95118 12.6583 2.14645 12.8536C2.34171 13.0488 2.65829 13.0488 2.85355 12.8536L7.5 8.20711L12.1464 12.8536C12.3417 13.0488 12.6583 13.0488 12.8536 12.8536C13.0488 12.6583 13.0488 12.3417 12.8536 12.1464L8.20711 7.5L12.8536 2.85355Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	) : (
		<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
			<path
				d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
				fill="currentColor"
				fillRule="evenodd"
				clipRule="evenodd"
			/>
		</svg>
	);
};
