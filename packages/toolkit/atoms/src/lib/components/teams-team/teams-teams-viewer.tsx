'use client';

import {
	Avatar,
	Badge,
	Button,
	cn,
	Input,
	Select,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@ever-teams/toolkit-ui';

import { ChangeEvent, useEffect, useState } from 'react';
import { IOrganizationTeamList, RoleName } from '@ever-teams/toolkit-types';
import { SpinOverlayLoader } from '@components/loaders/spin-overlay-loader';
import { useTeamsContext } from '@lib/context/teams-context';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TeamsTeamCreationFormDialog } from '@components/forms/team/team-creation-form';
import { useOrganizationTeams } from '@hooks/useOrganizationTeams';

export function TeamsTeamsViewer({ className }: { className?: string }) {
	const { selectedTeam, userOrganizations, selectedOrganization } = useTeamsContext();

	const { data: organizationTeams, loading: organisationsLoading } = useOrganizationTeams({ projectId: null });

	const [teams, setTeams] = useState<IOrganizationTeamList[]>([]);
	const [filteredTeams, setFilteredTeams] = useState<IOrganizationTeamList[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(5);

	const orgName =
		userOrganizations?.items.find((elt) => elt.organizationId == selectedOrganization)?.organization?.name ||
		'Ever';

	const { t } = useTranslation(undefined, { keyPrefix: 'TEAMS_VIEWER' });

	useEffect(() => {
		setTeams(organizationTeams?.items || []);
		setFilteredTeams(organizationTeams?.items || []);
	}, [organizationTeams]);

	const searchTeams = (e: ChangeEvent<HTMLInputElement>) => {
		const searchTerm = e.target.value.toLowerCase();
		setFilteredTeams(teams.filter((team) => team.name.toLowerCase().includes(searchTerm)));
		setCurrentPage(1); // Reset to the first page on search
	};

	// Pagination logic
	const indexOfLastItem = currentPage * itemsPerPage;
	const indexOfFirstItem = indexOfLastItem - itemsPerPage;
	const currentTeams = filteredTeams.slice(indexOfFirstItem, indexOfLastItem);

	const totalPages = Math.ceil(filteredTeams.length / itemsPerPage);

	const handlePageChange = (page: number) => {
		if (page >= 1 && page <= totalPages) {
			setCurrentPage(page);
		}
	};

	const handleItemsPerPageChange = (e: string) => {
		setItemsPerPage(Number(e));
		setCurrentPage(1); // Reset to the first page when items per page changes
	};

	return (
		<div
			className={cn(
				'flex flex-col gap-5 w-full bg-white dark:bg-black relative rounded-2xl p-6 shadow-xs',
				className
			)}
		>
			{organisationsLoading && <SpinOverlayLoader />}
			<div className="flex items-center justify-between ">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white">
					{t('title.all_teams', { orgName })}
				</h2>
			</div>

			<div className="flex w-full justify-between items-center">
				<Input onChange={searchTeams} placeholder={t('search_placeholder')} className="max-w-sm" />
				<TeamsTeamCreationFormDialog />
			</div>

			<Table className="border-none rounded-lg">
				<TableHeader>
					<TableRow className=" text-gray-500 dark:text-gray-400 text-xs uppercase dark:border-gray-700">
						<TableHead>{t('table_headers.name')}</TableHead>
						<TableHead>{`${t('table_headers.managers')}`}</TableHead>
						<TableHead>{t('table_headers.members')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredTeams.length === 0 ? (
						<TableRow>
							<TableCell colSpan={3} className="text-center text-gray-500">
								{t('table_empty.no_teams')}
							</TableCell>
						</TableRow>
					) : (
						currentTeams.map((team, index) => (
							<TableRow key={index} className="text-sm text-gray-700 dark:text-gray-200 border-none">
								<TableCell className="flex items-center gap-3 py-4">
									<Avatar
										src={team.image || ''}
										title={team.name}
										fallback={team.name?.charAt(0).toUpperCase()}
										className="w-8 h-8 rounded-full"
									/>
									<p className="font-semibold text-sm">{team.name}</p>{' '}
									{selectedTeam === team.id && <Badge>{'Current'}</Badge>}
								</TableCell>
								<TableCell>
									<span className="flex -space-x-2 transition-all duration-300  ">
										{team.members
											?.filter((elt) => elt?.role?.name === RoleName.MANAGER)
											.map((elt, index) => (
												<Avatar
													key={elt?.id || `manager-${index}`}
													src={elt?.employee?.user?.imageUrl || ''}
													title={elt?.employee?.fullName}
													fallback={elt?.employee?.fullName?.charAt(0).toUpperCase() || '?'}
													className="w-8 h-8 rounded-full border-2 border-white dark:border-black"
												/>
											))}
									</span>
								</TableCell>

								<TableCell>
									<span className="flex -space-x-2 transition-all duration-300  ">
										{team.members
											?.filter((elt) => elt?.role?.name !== RoleName.MANAGER)
											.map((elt) => (
												<Avatar
													key={elt?.id || Math.random()}
													src={elt?.employee?.user?.imageUrl || ''}
													title={elt?.employee?.fullName}
													fallback={elt?.employee?.fullName?.charAt(0).toUpperCase() || '?'}
													className="w-8 h-8 rounded-full border-2 border-white dark:border-black"
												/>
											))}
									</span>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>

			<div className="flex items-center justify-between ">
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
