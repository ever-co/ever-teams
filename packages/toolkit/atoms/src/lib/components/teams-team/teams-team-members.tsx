'use client';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	Avatar,
	Badge,
	Button,
	cn,
	Input,
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarTrigger,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	toast
} from '@ever-teams/toolkit-ui';

import { ChangeEvent, useEffect, useState } from 'react';
import { IOrganizationTeamList, OT_Member, RoleName } from '@ever-teams/toolkit-types';
import { SpinOverlayLoader } from '@components/loaders/spin-overlay-loader';
import { useTeamsContext } from '@lib/context/teams-context';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { ChevronLeft, ChevronRight, EllipsisVertical, LoaderCircleIcon, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getOrganisationTeams, updateTeam } from '@ever-teams/api';
import { useOrganizationTeams } from '@hooks/useOrganizationTeams';
import { TeamsMemberInvitationFormDialog } from '@components/forms/team/member-invitation-form';

export function TeamsTeamMembers({ className }: { className?: string }) {
	const { selectedTeam, authenticatedUser: user, selectedOrganization: organizationId, token } = useTeamsContext();

	const { data: fetchedOrganizationTeams, loading: organisationsLoading } = useOrganizationTeams({ projectId: null });

	// Local state to manage teams data (allows updates after member removal)
	const [organizationTeams, setOrganizationTeams] = useState(fetchedOrganizationTeams);

	useEffect(() => {
		setOrganizationTeams(fetchedOrganizationTeams);
	}, [fetchedOrganizationTeams]);

	const [team, setTeam] = useState<IOrganizationTeamList[]>([]);
	const [members, setMembers] = useState<OT_Member[]>([]);
	const [filteredMembers, setFilteredMembers] = useState<OT_Member[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(5);
	const [removeLoading, setRemoveLoading] = useState(false);
	const [showDialog, setShowDialog] = useState(false);
	const [selectedMember, setSelectedMember] = useState<{ memberId: string; teamId: string } | null>(null);

	const { t } = useTranslation(undefined, { keyPrefix: 'TEAM_MEMBERS' });

	useEffect(() => {
		setTeam(organizationTeams?.items || []);
	}, [organizationTeams]);

	useEffect(() => {
		if (selectedTeam && organizationTeams) {
			const selected =
				selectedTeam !== 'all'
					? organizationTeams.items.filter((team) => team?.id === selectedTeam)
					: organizationTeams.items;
			setTeam(selected || []);
			setCurrentPage(1);
		}
	}, [selectedTeam]);

	useEffect(() => {
		// Remove Duplicates and Use `employeeId` as the unique key
		const uniqueMembers = Array.from(
			new Map(
				team
					.map((team) => team.members)
					.flat(1)
					.map((member) => [member.employeeId, member])
			).values()
		);
		setMembers(uniqueMembers);
		setFilteredMembers(uniqueMembers); // Initialize filtered members with the full list
	}, [team]);

	const searchTeamMember = (e: ChangeEvent<HTMLInputElement>) => {
		const searchTerm = e.target.value.toLowerCase();
		setFilteredMembers(members.filter((member) => member.employee.fullName.toLowerCase().includes(searchTerm)));
		setCurrentPage(1); // Reset to the first page on search
	};

	// Pagination logic
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = indexOfLastItem - itemsPerPage;
	const currentMembers = filteredMembers.slice(indexOfFirstItem, indexOfLastItem);

	const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	const handleItemsPerPageChange = (e: string) => {
		setItemsPerPage(Number(e));
		setCurrentPage(1); // Reset to the first page when items per page changes
	};

	const removeTeamMember = async (memberId: string, selectedTeamId: string) => {
		setRemoveLoading(true);

		if (selectedTeamId == 'all') {
			toast({ variant: 'destructive', description: 'Please select team team before removing a member.' });
			setRemoveLoading(false);
			return;
		}

		const currentTeam = team.find((elt) => elt?.id === selectedTeamId);
		if (!currentTeam) {
			toast({ variant: 'destructive', description: 'No team selected' });
			setRemoveLoading(false);
			return;
		}

		const updatedMembers = currentTeam.members.filter((member) => member.employeeId !== memberId);

		const managerIds = updatedMembers
			.filter((member) => member.role?.name == RoleName.MANAGER)
			.map((elt) => elt.employeeId);

		const memberIds = updatedMembers
			.filter((member) => member.role?.name != RoleName.MANAGER)
			.map((elt) => elt.employeeId);

		try {
			if (!user) throw Error('User not authenticated');

			const updatedTeam = await updateTeam({
				currentUser: user,
				token,
				organizationId: organizationId,
				data: { teamId: currentTeam?.id, name: currentTeam.name, managerIds, memberIds, tags: [] }
			});

			if ('error' in updatedTeam) {
				toast({ variant: 'destructive', description: updatedTeam.error });
				setRemoveLoading(false);
				return;
			}

			toast({ variant: 'default', description: t('dialog.remove_member_success') });

			// Update Teams - refetch from API
			const newTeams = await getOrganisationTeams({ user, token, organizationId, projectId: null });
			if (!newTeams || 'error' in newTeams) {
				toast({ variant: 'destructive', description: newTeams?.error || 'Failed to update teams' });
				setRemoveLoading(false);
				return;
			}
			setOrganizationTeams(newTeams);
			setMembers(updatedMembers);
			setFilteredMembers(updatedMembers);
		} catch (error) {
			toast({ variant: 'destructive', description: (error as Error).message || 'Unknown Error' });
			setRemoveLoading(false);
		}

		setRemoveLoading(false);
	};

	const isManagerInCurrentTeam = () => {
		if (!user || !selectedTeam || selectedTeam === 'all') return false;

		const currentTeam = team.find((t) => t?.id === selectedTeam);
		if (!currentTeam) return false;

		return currentTeam.members.some(
			(member) => member.employeeId === user.employee?.id && member.role?.name === RoleName.MANAGER
		);
	};

	const isManager = isManagerInCurrentTeam();

	return (
		<div
			className={cn(
				'flex flex-col gap-5 w-full bg-white dark:bg-black rounded-2xl p-6 shadow-xs relative',
				className
			)}
		>
			{organisationsLoading && <SpinOverlayLoader />}
			<div className="flex items-center justify-between ">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
					{selectedTeam !== 'all' ? t('title.single_team') + (team[0]?.name || '') : t('title.all_teams')}
				</h2>
			</div>

			<div className="flex w-full justify-between items-center">
				<Input onChange={searchTeamMember} placeholder={t('search_placeholder')} className="max-w-sm" />
				{selectedTeam !== 'all' && isManager && <TeamsMemberInvitationFormDialog />}
			</div>

			<Table className="border-none  rounded-lg max-h-[400px] overflow-y-scroll">
				<TableHeader>
					<TableRow className=" text-gray-500 dark:text-gray-400 text-xs uppercase dark:border-gray-700">
						<TableHead>{t('table_headers.name')}</TableHead>
						<TableHead>{t('table_headers.email')}</TableHead>
						<TableHead>{t('table_headers.position')}</TableHead>
						<TableHead>{t('table_headers.roles')}</TableHead>
						<TableHead>{t('table_headers.joined_left')}</TableHead>
						<TableHead>{t('table_headers.status')}</TableHead>
						<TableHead>{t('table_headers.actions')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredMembers.length === 0 ? (
						<TableRow>
							<TableCell colSpan={7} className="text-center text-gray-500">
								{t('table_empty.no_members')}
							</TableCell>
						</TableRow>
					) : (
						currentMembers.map((member, index) => (
							<TableRow key={index} className="text-sm text-gray-700 dark:text-gray-200 border-none">
								<TableCell className="flex items-center gap-3 py-4">
									<Avatar
										src={member?.employee?.user?.imageUrl || ''}
										title={member?.employee?.fullName || ''}
										fallback={(member?.employee?.fullName?.[0] || '?').toUpperCase()}
										className="w-8 h-8 rounded-full"
									/>

									<p className="font-semibold text-sm">{member?.employee?.fullName || '-'}</p>
								</TableCell>
								<TableCell>{member?.employee?.user?.email || '-'}</TableCell>
								<TableCell>{'-'}</TableCell>
								<TableCell className="font-bold text-purple-900 dark:text-purple-300">
									{member?.role?.name || '-'}
								</TableCell>
								<TableCell className="text-xs font-medium">
									{member?.createdAt
										? new Date(member.createdAt).toLocaleDateString('fr-FR', {
												year: 'numeric',
												month: '2-digit',
												day: '2-digit'
											})
										: '-'}
								</TableCell>
								<TableCell>
									<Badge className="text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-200  rounded-full px-3 py-1">
										{t('status.member')}
									</Badge>
								</TableCell>
								<TableCell>
									<Menubar className="bg-inherit border-none shadow-none">
										<MenubarMenu>
											<MenubarTrigger>
												<EllipsisVertical className="size-4" />
											</MenubarTrigger>
											<MenubarContent
												align="end"
												className="p-1 border-none min-w-full text-sm rounded-lg"
											>
												<MenubarItem
													className="text-red-500 hover:text-red-500"
													onSelect={() => {
														setShowDialog(true);
														setSelectedMember({
															memberId: member?.employeeId || '',
															teamId: selectedTeam || ''
														});
													}}
													disabled={!isManager}
												>
													{t(
														user?.employee?.id === member?.employeeId
															? 'actions.leave_team'
															: 'actions.remove_member'
													)}
												</MenubarItem>
											</MenubarContent>
										</MenubarMenu>
									</Menubar>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>

			{/* Remove Member And Delete Dialog */}
			<AlertDialog open={showDialog} onOpenChange={setShowDialog}>
				<AlertDialogContent className="dark:border-gray-700">
					<AlertDialogHeader>
						<AlertDialogTitle className="text-black dark:text-white md:text-left">
							{t(
								user?.employee?.id !== selectedMember?.memberId
									? 'dialog.remove_member.title'
									: 'dialog.leave_team.title'
							)}
						</AlertDialogTitle>
						<AlertDialogDescription className="md:text-left">
							{t(
								user?.employee?.id !== selectedMember?.memberId
									? 'dialog.remove_member.description'
									: 'dialog.leave_team.description'
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							disabled={removeLoading}
							className="md:mt-0"
							onClick={() => setShowDialog(false)}
						>
							{t('dialog.cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={removeLoading}
							className="flex items-center justify-center gap-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm transition"
							onClick={() => {
								if (selectedMember) {
									removeTeamMember(selectedMember.memberId, selectedMember.teamId);
								}
								setShowDialog(false);
							}}
						>
							{removeLoading ? (
								<LoaderCircleIcon className="animate-spin size-4" />
							) : (
								<Trash2 size={16} />
							)}{' '}
							{t(user?.employee?.id !== selectedMember?.memberId ? 'dialog.remove' : 'dialog.leave')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className="flex items-center justify-between">
				<Select
					placeholder={t('pagination.show')}
					value={itemsPerPage.toString()}
					onValueChange={handleItemsPerPageChange}
					className="w-fit min-w-[100px] text-sm"
					values={[
						{ label: t('pagination.show', { number: 5 }), value: '5' },
						{ label: t('pagination.show', { number: 10 }), value: '10' },
						{ label: t('pagination.show', { number: 20 }), value: '20' },
						{ label: t('pagination.show', { number: 50 }), value: '50' }
					]}
				/>

				<div className="flex items-center gap-2">
					<Button
						onClick={() => handlePageChange(currentPage - 1)}
						disabled={currentPage === 1}
						variant={'secondary'}
						className="p-3 border rounded-xl disabled:opacity-50"
					>
						<ChevronLeft className="size-5 text-gray-500 " />
					</Button>
					<span className="text-sm text-gray-700 dark:text-gray-200">
						{t('pagination.page', { currentPage, totalPages })}
					</span>
					<Button
						onClick={() => handlePageChange(currentPage + 1)}
						disabled={currentPage === totalPages}
						variant={'secondary'}
						className="p-3 border rounded-xl disabled:opacity-50 "
					>
						<ChevronRight className="size-5 text-gray-500" />
					</Button>
				</div>
			</div>

			<TeamsTimerFooter />
		</div>
	);
}
