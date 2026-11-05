import { CHARACTER_LIMIT_TO_SHOW } from '@/core/constants/config/constants';
import { imgTitle } from '@/core/lib/helpers/index';
import { useSettings, useSyncRef } from '@/core/hooks';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { activeTeamIdState, activeTeamState, organizationTeamsState } from '@/core/stores';
import { isTeamManagerMember } from '@/core/stores/teams/organization-team';
import { employeeIdOf, rosterWithRole, teamRosterOf } from '@/core/lib/utils/settings-team';
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
import { TOrganizationTeamEmployee, TRole } from '@/core/types/schemas';
import { useUpdateOrganizationTeam } from '@/core/hooks/organizations/teams/use-update-organization-team';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/core/components/common/table';

const HEAD_CELL = 'whitespace-nowrap';
const BODY_CELL = 'text-sm text-foreground';
const NAME_TEXT = 'max-w-[12.5rem] overflow-hidden text-ellipsis whitespace-nowrap 3xl:max-w-[14.25rem]';

function memberStatusFor(isActive: boolean | undefined) {
	if (isActive) {
		return 'Member';
	}
	return 'Suspended';
}

export const MemberTable = ({ members }: { members: TOrganizationTeamEmployee[] }) => {
	const t = useTranslations();
	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems, pageCount } =
		usePagination<TOrganizationTeamEmployee>({ items: members, defaultItemsPerPage: 5 });
	const { updateAvatar } = useSettings();
	const activeTeam = useAtomValue(activeTeamState);
	const { updateOrganizationTeam } = useUpdateOrganizationTeam();

	const activeTeamRef = useSyncRef(activeTeam);

	const activeTeamId = useAtomValue(activeTeamIdState);
	const [organizationTeams, setOrganizationTeams] = useAtom(organizationTeamsState);
	const editMemberRef = useRef<TOrganizationTeamEmployee | null>(null);

	const updateTeamMember = useCallback(
		(updatedMember: TOrganizationTeamEmployee) => {
			const teamIndex = organizationTeams.findIndex((team) => team.id === activeTeamId);
			if (teamIndex === -1) return;

			const tempTeams = cloneDeep(organizationTeams);
			const memberIndex = tempTeams?.[teamIndex].members?.findIndex((member) => member.id === updatedMember.id);

			if (memberIndex === -1) return;

			if (tempTeams && tempTeams[teamIndex] && tempTeams[teamIndex].members && memberIndex !== undefined) {
				const members = tempTeams[teamIndex].members!;
				members[memberIndex] = updatedMember;
			}
			setOrganizationTeams(tempTeams);
		},
		[activeTeamId, organizationTeams, setOrganizationTeams]
	);

	const handleEdit = useCallback((member: TOrganizationTeamEmployee) => {
		editMemberRef.current = member;
	}, []);

	const handleManagerRoleUpdate = useCallback(
		(employeeId: string, isPromotingToManager: boolean) => {
			if (!activeTeamRef.current || !employeeId) return;

			// Both lists go with the team, in employee ids: the API reads a list the body leaves out as empty, so
			// managers sent alone would take every other member out of the team
			const roster = teamRosterOf(activeTeamRef.current.members ?? [], isTeamManagerMember);
			const role = isPromotingToManager ? 'manager' : 'member';

			return updateOrganizationTeam(activeTeamRef.current, {
				...activeTeamRef.current,
				...rosterWithRole(roster, employeeId, role)
			});
		},
		[updateOrganizationTeam, activeTeamRef]
	);

	const handleRoleChange = useCallback(
		(newRole: TRole) => {
			if (!editMemberRef.current || !activeTeamRef.current) return;

			const { role } = editMemberRef.current;
			const employeeId = employeeIdOf(editMemberRef.current) ?? '';

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
		const tempMember: TOrganizationTeamEmployee | null = cloneDeep(editMemberRef.current);

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
			<Table className="w-full text-left text-sm">
				<TableHeader>
					<TableRow className="hover:bg-transparent">
						<TableHead scope="col" className={clsxm(HEAD_CELL, 'min-w-32')}>
							{t('common.NAME')}
						</TableHead>
						<TableHead scope="col" className={clsxm(HEAD_CELL, 'min-w-32')}>
							{t('common.POSITION')}
						</TableHead>
						<TableHead scope="col" className={clsxm(HEAD_CELL, 'min-w-32')}>
							{t('common.ROLES')}
						</TableHead>
						<TableHead scope="col" className={clsxm(HEAD_CELL, 'min-w-36')}>
							{t('common.JOIN_OR_LEFT')}
						</TableHead>
						<TableHead scope="col" className={clsxm(HEAD_CELL, 'min-w-32')}>
							{t('common.STATUS')}
						</TableHead>
						<TableHead scope="col" className={clsxm(HEAD_CELL, 'w-12')}></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{currentItems.map((member) => {
						const isEditing = Boolean(editMemberRef.current) && editMemberRef.current?.id === member.id;
						const hasImage = Boolean(member.employee.user?.imageId);
						const showsInitials = !hasImage && Boolean(member.employee.user?.name);
						const fullName = member.employee.fullName.trim();
						const email = (member.employee.user?.email || '').trim();
						return (
							<TableRow key={member.id}>
								<TableCell scope="row" className="whitespace-nowrap text-foreground">
									<div className="flex items-center gap-3">
										{hasImage && (
											<Avatar
												size={32}
												className="relative shrink-0 cursor-pointer"
												imageUrl={
													member.employee.user?.image?.thumbUrl ||
													member.employee.user?.image?.fullUrl ||
													member.employee.user?.imageUrl
												}
												alt="User Avatar"
											/>
										)}
										{showsInitials && (
											<div
												className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-normal text-foreground"
												style={{
													backgroundColor: `${stc(member.employee.user?.name || '')}80`
												}}
											>
												{imgTitle(member.employee.user?.name)}
											</div>
										)}
										<div className="flex min-w-0 flex-col gap-0.5">
											{isEditing && (
												<InputField
													type="text"
													placeholder={t('pages.settingsTeam.ENTER_NAME')}
													className="mb-0 h-5 border-none max-w-[12rem] 3xl:max-w-[14rem] pl-0 py-0 rounded-none border-b-1"
													noWrapper
													autoFocus
													defaultValue={member.employee.fullName}
													onBlur={handleEditMemberSave}
													onChange={handelNameChange}
													onKeyUp={handleOnKeyUp}
												/>
											)}
											{!isEditing && (
												<Tooltip
													label={fullName}
													placement="auto"
													enabled={fullName.length > CHARACTER_LIMIT_TO_SHOW}
												>
													<div
														className={clsxm(
															NAME_TEXT,
															'text-sm font-medium text-foreground'
														)}
														onDoubleClick={() => {
															handleEdit(member);
														}}
													>
														{member.employee.fullName}
													</div>
												</Tooltip>
											)}

											<Tooltip
												label={email}
												placement="auto"
												enabled={email.length > CHARACTER_LIMIT_TO_SHOW}
											>
												<Text
													className={clsxm(
														NAME_TEXT,
														'text-xs font-normal text-muted-foreground'
													)}
												>
													{member.employee.user?.email || ''}
												</Text>
											</Tooltip>
										</div>
									</div>
								</TableCell>
								<TableCell className={BODY_CELL}>{/* TODO Position */}-</TableCell>
								<TableCell className={BODY_CELL} onDoubleClick={() => handleEdit(member)}>
									{isEditing && (
										<EditUserRoleDropdown member={member} handleRoleChange={handleRoleChange} />
									)}
									{!isEditing && <span className="capitalize">{getRoleString(member.role)}</span>}
								</TableCell>
								<TableCell className={clsxm(BODY_CELL, 'whitespace-nowrap tabular-nums')}>
									{/* 12 Feb 2020 12:00 pm */}
									{moment(member.employee.createdAt).format('DD MMM YYYY hh:mm a')}
								</TableCell>
								<TableCell>
									{/* TODO dynamic */}
									<MemberTableStatus status={memberStatusFor(member.employee.isActive)} />
								</TableCell>
								<TableCell className="w-12">
									<TableActionPopover member={member} handleEdit={handleEdit} status="settings" />
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>

			<Paginate
				className="px-4 pb-4"
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

const getRoleString = (role: TRole | undefined | null) => {
	return role?.name || 'MEMBER';
};
