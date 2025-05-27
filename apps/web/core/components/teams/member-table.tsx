import { CHARACTER_LIMIT_TO_SHOW } from '@/core/constants/config/constants';
import { imgTitle } from '@/core/lib/helpers/index';
import { useOrganizationTeams, useSettings, useSyncRef } from '@/core/hooks';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import { clsxm } from '@/core/lib/utils';
import { Text } from '@/core/components';
import cloneDeep from 'lodash/cloneDeep';
import moment from 'moment';
import { ChangeEvent, KeyboardEvent, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAtom, useAtomValue } from 'jotai';
import stc from 'string-to-color';
import { MemberTableStatus } from './member-table-status';
import { TableActionPopover } from '../settings/table-action-popover';
import { EditUserRoleDropdown } from '../features/roles/edit-role-dropdown';
import { Avatar } from '../duplicated-components/avatar';
import { InputField } from '../duplicated-components/_input';
import { Tooltip } from '../duplicated-components/tooltip';
import { Paginate } from '../duplicated-components/_pagination';
import { IRole } from '@/core/types/interfaces/role/IRole';
import { IEmployee } from '@/core/types/interfaces/organization/employee/IEmployee';
import { IOrganizationTeamEmployee } from '@/core/types/interfaces/team/IOrganizationTeamEmployee';

export const MemberTable = ({ members }: { members: IEmployee[] }) => {
	const t = useTranslations();
	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems, pageCount } =
		usePagination<IEmployee>(members, 5);
	const { activeTeam, updateOrganizationTeam } = useOrganizationTeams();
	const { updateAvatar } = useSettings();

	const activeTeamRef = useSyncRef(activeTeam);

	const activeTeamId = useAtomValue(activeTeamIdState);
	const [organizationTeams, setOrganizationTeams] = useAtom(organizationTeamsState);
	const editMemberRef = useRef<IOrganizationTeamEmployee | null>(null);

	const updateTeamMember = useCallback(
		(updatedMember: IOrganizationTeamEmployee) => {
			const teamIndex = organizationTeams.findIndex((team) => team.id === activeTeamId);
			if (teamIndex === -1) return;

			const tempTeams = cloneDeep(organizationTeams);
			const memberIndex = tempTeams[teamIndex].members?.findIndex(
				(member: IOrganizationTeamEmployee) => member.id === updatedMember.id
			);

			if (memberIndex === -1) return;

			if (tempTeams[teamIndex].members && memberIndex !== undefined) {
				tempTeams[teamIndex].members[memberIndex] = updatedMember;
			}
			setOrganizationTeams(tempTeams);
		},
		[activeTeamId, organizationTeams, setOrganizationTeams]
	);

	const handleEdit = useCallback((member: IOrganizationTeamEmployee) => {
		editMemberRef.current = member;
	}, []);

	const handleManagerRoleUpdate = useCallback(
		(employeeId: string, isPromotingToManager: boolean) => {
			if (!activeTeamRef.current) return;

			// Get current managers
			const currentManagers: string[] =
				activeTeamRef.current?.members
					?.filter((member: IOrganizationTeamEmployee) => member.role?.name === 'MANAGER')
					.map((manager: IOrganizationTeamEmployee) => manager.employee?.id || '') || [];

			if (isPromotingToManager) {
				// Add new manager
				const updatedManagerIds = [...new Set([...currentManagers, employeeId])];

				return updateOrganizationTeam(activeTeamRef.current, {
					...activeTeamRef.current,
					managerIds: updatedManagerIds
				});
			} else {
				// Remove manager
				const updatedManagerIds = currentManagers.filter((id) => id !== employeeId);

				return updateOrganizationTeam(activeTeamRef.current, {
					...activeTeamRef.current,
					managerIds: updatedManagerIds
				});
			}
		},
		[updateOrganizationTeam, activeTeamRef]
	);

	const handleRoleChange = useCallback(
		(newRole: IRole) => {
			if (!editMemberRef.current || !activeTeamRef.current) return;

			const { employeeId = '', role } = editMemberRef.current;

			const isPromotingToManager = role?.name !== 'MANAGER' && newRole?.name === 'MANAGER';
			handleManagerRoleUpdate(employeeId, isPromotingToManager);

			// Update Organization Team
			// const updatedMember = { ...editMemberRef.current, roleId: !isPromotingToManager ? '' :  };
			// updateTeamMember(updatedMember);
			editMemberRef.current = null;
		},
		[activeTeamRef, handleManagerRoleUpdate]
	);

	const handelNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		const name = event.target.value || '';

		if (name === editMemberRef.current?.employee?.fullName) {
			return;
		}

		const names = name.split(' ');
		const tempMember: IOrganizationTeamEmployee | null = cloneDeep(editMemberRef.current);

		if (tempMember?.employee?.user) {
			tempMember.employee.fullName = name;
			tempMember.employee.user.firstName = names[0] || '';
			tempMember.employee.user.lastName = names[1] || '';
			editMemberRef.current = tempMember;
		}
	}, []);

	const handleEditMemberSave = useCallback(() => {
		const member = editMemberRef.current;
		if (member) {
			updateAvatar({
				firstName: member.employee?.user?.firstName || '',
				lastName: member.employee?.user?.lastName || '',
				id: member.employee?.userId || ''
			}).then(() => {
				if (member) {
					updateTeamMember(member);
				}
			});
		}
	}, [updateAvatar, updateTeamMember]);

	const handleOnKeyUp = (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === 'Enter') {
			handleEditMemberSave();
		}
		editMemberRef.current = null;
	};

	return (
		<div>
			<div
				className={clsxm(
					'sm:rounded-lg overflow-auto',
					itemsPerPage <= 5 ? 'h-[28rem]' : '',
					itemsPerPage > 5 && itemsPerPage <= 10 ? 'h-[35rem]' : '',
					itemsPerPage > 10 && itemsPerPage <= 20 ? 'h-[45rem]' : '',
					itemsPerPage > 20 ? 'h-[55rem]' : ''
				)}
			>
				<table className="w-full text-sm text-left text-gray-500 dark:bg-dark--theme-light">
					<thead className="text-xs text-gray-700 uppercase border-b">
						<tr>
							<th
								scope="col"
								className="pl-0 py-3 text-sm font-normal capitalize min-w-[15rem] text-[#B1AEBC] dark:text-white w-56"
							>
								{t('common.NAME')}
							</th>
							<th
								scope="col"
								className="text-sm font-normal capitalize min-w-[10rem] text-[#B1AEBC] dark:text-white w-40"
							>
								{t('common.POSITION')}
							</th>
							<th
								scope="col"
								className="text-sm font-normal capitalize min-w-[10rem] text-[#B1AEBC] dark:text-white w-44"
							>
								{t('common.ROLES')}
							</th>
							<th
								scope="col"
								className="text-sm font-normal capitalize min-w-[15rem] text-[#B1AEBC] dark:text-white w-48"
							>
								{t('common.JOIN_OR_LEFT')}
							</th>
							<th
								scope="col"
								className="text-sm font-normal capitalize min-w-[10rem] text-[#B1AEBC] dark:text-white w-32"
							>
								{t('common.STATUS')}
							</th>
							<th
								scope="col"
								className="text-sm font-normal capitalize text-[#B1AEBC] dark:text-white w-6"
							></th>
						</tr>
					</thead>
					<tbody className="dark:bg-dark--theme-light">
						{currentItems.map((member, index) => (
							<tr className="bg-white dark:bg-dark--theme-light dark:border-gray-700" key={index}>
								<th
									scope="row"
									className="flex items-center py-4 pl-0 text-gray-900 whitespace-nowrap dark:text-white"
								>
									{member.employee.user?.imageId ? (
										<Avatar
											size={35}
											className="relative cursor-pointer"
											imageUrl={
												member.employee.user?.image?.thumbUrl ||
												member.employee.user?.image?.fullUrl ||
												member.employee.user?.imageUrl
											}
											alt="User Avatar"
										/>
									) : member.employee.user?.name ? (
										<div
											className={clsxm(
												'w-[35px] h-[35px]',
												'flex justify-center items-center',
												'rounded-full text-xs text-default dark:text-white',
												'shadow-md font-normal'
											)}
											style={{
												backgroundColor: `${stc(member.employee.user?.name || '')}80`
											}}
										>
											{imgTitle(member.employee.user?.name)}
										</div>
									) : (
										''
									)}
									<div className="flex flex-col gap-1 pl-3 ">
										{editMemberRef.current && editMemberRef.current.id === member.id ? (
											<InputField
												type="text"
												placeholder={'Enter Name'}
												className="mb-0 h-5 border-none max-w-[12rem] 3xl:max-w-[14rem] pl-0 py-0 rounded-none border-b-1"
												noWrapper
												autoFocus
												defaultValue={member.employee.fullName}
												onBlur={handleEditMemberSave}
												onChange={handelNameChange}
												onKeyUp={handleOnKeyUp}
											/>
										) : (
											<Tooltip
												label={member.employee.fullName.trim()}
												placement="auto"
												enabled={
													member.employee.fullName.trim().length > CHARACTER_LIMIT_TO_SHOW
												}
											>
												<div
													className="text-sm font-semibold text-[#282048] dark:text-white max-w-[12.5rem] 3xl:max-w-[14.25rem] overflow-hidden text-ellipsis whitespace-nowrap"
													onDoubleClick={() => {
														handleEdit(member);
													}}
												>
													{member.employee.fullName}
												</div>
											</Tooltip>
										)}

										<Tooltip
											label={(member.employee.user?.email || '').trim()}
											placement="auto"
											enabled={
												(member.employee.user?.email || '').trim().length >
												CHARACTER_LIMIT_TO_SHOW
											}
										>
											<Text className="text-xs dark:text-white text-[#B1AEBC] font-normal max-w-[12.5rem] 3xl:max-w-[14.25rem] overflow-hidden text-ellipsis whitespace-nowrap">
												{member.employee.user?.email || ''}
											</Text>
										</Tooltip>
									</div>
								</th>
								<td className="text-sm font-semibold py-4 text-[#282048] dark:text-white">
									{/* TODO Position */}-
								</td>
								<td
									className="text-sm font-semibold py-4 text-[#282048] dark:text-white"
									onDoubleClick={() => handleEdit(member)}
								>
									{editMemberRef.current && editMemberRef.current.id === member.id ? (
										<EditUserRoleDropdown member={member} handleRoleChange={handleRoleChange} />
									) : (
										<span className="capitalize">{getRoleString(member.role)}</span>
									)}
								</td>
								<td className="text-sm font-semibold py-4 text-[#282048] dark:text-white">
									{/* 12 Feb 2020 12:00 pm */}
									{moment(member.employee.createdAt).format('DD MMM YYYY hh:mm a')}
								</td>
								<td className="py-4 text-sm font-semibold">
									{/* TODO dynamic */}
									<MemberTableStatus status={member.employee.isActive ? 'Member' : 'Suspended'} />
								</td>
								<td className="flex items-center justify-center py-4">
									<TableActionPopover member={member} handleEdit={handleEdit} status="settings" />
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<Paginate
				total={total}
				onPageChange={onPageChange}
				pageCount={pageCount}
				itemsPerPage={itemsPerPage}
				itemOffset={itemOffset}
				endOffset={endOffset}
				setItemsPerPage={setItemsPerPage}
			/>
		</div>
	);
};

const getRoleString = (role: IRole | undefined) => {
	return role?.name || 'MEMBER';
};
