import {
	Button,
	modalFieldLabelClass,
	modalFooterClass,
	modalPrimaryActionClass,
	modalSecondaryActionClass
} from '@/core/components';
import { Check, Lock, Plus, X } from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { FormEvent, useCallback, useState, useMemo } from 'react';
import { Identifiable, Select, Thumbnail } from './basic-information-form';
import { IStepElementProps } from '../container';
import { cn } from '@/core/lib/helpers';
import { useTranslations } from 'next-intl';
import { getInitialValue, resolveProjectRoleId } from '@/core/lib/helpers/create-project';
import { EProjectRelation } from '@/core/types/generics/enums/project';
import { ERoleName } from '@/core/types/generics/enums/role';
import { TProjectRelation } from '@/core/types/schemas';
import { useAtomValue } from 'jotai';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
import { useRolesQuery } from '@/core/hooks/roles/use-roles-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { ROLES } from '@/core/constants/config/constants';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

export default function TeamAndRelationsForm(props: IStepElementProps) {
	const { goToNext, goToPrevious, currentData } = props;
	const [members, setMembers] = useState<{ memberId: string; roleId: string; id: string }[]>(() =>
		getInitialValue(currentData, 'members', [])
	);
	const [relations, setRelations] = useState<(TProjectRelation & { id: string })[]>([]);

	// Get user role for permission check
	const { data: user } = useUserQuery();
	const isGlobalAdmin = useMemo(() => {
		const roleName = user?.role?.name as ERoleName | undefined;
		return roleName === ERoleName.ADMIN || roleName === ERoleName.SUPER_ADMIN;
	}, [user?.role?.name]);

	// Get teams for multi-select
	const { organizationProjects } = useOrganizationProjectsQuery();
	const allTeams = useAtomValue(organizationTeamsState);
	const activeTeam = useAtomValue(activeTeamState);

	// Filter available teams based on user role:
	// - Admin: Can see all teams
	// - Manager/Member: Can only see active team
	const teams = useMemo(() => {
		if (isGlobalAdmin) {
			return allTeams;
		}
		// Non-admin users can only see the active team
		return activeTeam ? [activeTeam] : [];
	}, [isGlobalAdmin, allTeams, activeTeam]);

	// Selected teams state - initialized with activeTeam or existing teams from edit mode
	// Active team is ALWAYS included and cannot be deselected by non-admins
	const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => {
		const existingTeams = getInitialValue(currentData, 'teams', []);
		if (existingTeams.length > 0) {
			const existingIds = existingTeams.map((t: { id: string }) => t.id);
			// In edit mode, ensure active team is included if not already
			if (activeTeam?.id && !existingIds.includes(activeTeam.id)) {
				return [...existingIds, activeTeam.id];
			}
			return existingIds;
		}
		// Default to activeTeam if no teams are set (MANDATORY)
		return activeTeam?.id ? [activeTeam.id] : [];
	});

	// Team selection error state
	const [teamError, setTeamError] = useState<string | null>(null);

	const { roles: rolesFromApi } = useRolesQuery();
	const relationsData = Object.values(EProjectRelation);
	const t = useTranslations();

	// Fallback to ROLES constants if API doesn't return roles (non-admin users)
	const availableRoles = useMemo(() => {
		// If API returned roles, use them
		if (rolesFromApi && rolesFromApi.length > 0) {
			return rolesFromApi
				.filter((role) => role.name === ERoleName.EMPLOYEE || role.name === ERoleName.MANAGER)
				.map((role) => ({
					id: String(role.id),
					value: role.name
				}));
		}

		// Fallback: use ROLES constants with generated IDs
		return ROLES.filter((role) => role.name === ERoleName.EMPLOYEE || role.name === ERoleName.MANAGER).map(
			(role) => ({
				id: `fallback-${role.name}`,
				value: role.name
			})
		);
	}, [rolesFromApi]);

	// Deduplicated list of all team members to prevent user duplication
	const allMembers = useMemo(() => {
		if (!teams?.length) return [];

		// Create a Map to deduplicate users by employeeId
		const memberMap = new Map();

		teams.forEach((team) => {
			team.members?.forEach((member) => {
				const employeeId = member?.employeeId;
				if (employeeId && !memberMap.has(employeeId)) {
					memberMap.set(employeeId, {
						id: employeeId,
						value: member?.employee?.fullName || '',
						imgUrl: member?.employee?.user?.imageUrl || undefined
					});
				}
			});
		});

		return Array.from(memberMap.values());
	}, [teams]);

	const handleAddNewMember = () => {
		setMembers((prev) => [
			...prev,
			{ id: `member-${crypto.randomUUID()}-${Date.now()}`, memberId: '', roleId: '' }
		]);
	};

	const handleRemoveMember = (id: string) => {
		setMembers((prev) => prev.filter((el) => el.id !== id));
	};

	const handleAddNewRelation = () => {
		setRelations((prev) => [
			...prev,
			{ id: `relation-${crypto.randomUUID()}-${Date.now()}`, projectId: '', relationType: null }
		]);
	};

	const handleRemoveRelation = (id: string) => {
		setRelations((prev) => prev.filter((el) => el.id !== id));
	};

	// Check if a team can be deselected
	// - Active team cannot be deselected by non-admins
	// - Admins can deselect active team ONLY if another team is selected
	const canDeselectTeam = useCallback(
		(teamId: string) => {
			// If it's not the active team, it can always be deselected
			if (teamId !== activeTeam?.id) return true;

			// Active team can only be deselected by admins
			if (!isGlobalAdmin) return false;

			// Admin can deselect active team only if at least one OTHER team is selected
			const otherTeamsSelected = selectedTeamIds.filter((id) => id !== activeTeam?.id);
			return otherTeamsSelected.length > 0;
		},
		[activeTeam?.id, isGlobalAdmin, selectedTeamIds]
	);

	// Toggle team selection with guards
	const handleToggleTeam = (teamId: string) => {
		setSelectedTeamIds((prev) => {
			if (prev.includes(teamId)) {
				// Trying to remove a team
				// Check if this is allowed
				if (!canDeselectTeam(teamId)) {
					// Cannot deselect - return unchanged
					return prev;
				}
				return prev.filter((id) => id !== teamId);
			} else {
				// Add team
				return [...prev, teamId];
			}
		});
		// Clear error when user selects a team
		setTeamError(null);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();

		// Validate that at least one team is selected
		if (selectedTeamIds.length === 0) {
			setTeamError(t('pages.projects.teamAndRelationsForm.errors.atLeastOneTeamRequired'));
			return;
		}

		// Map selected team IDs to team objects for the API
		const selectedTeams = teams?.filter((team) => selectedTeamIds.includes(team.id)) || [];

		goToNext?.({
			members,
			relations: relations.filter((el) => el.projectId && el.relationType),
			teams: selectedTeams
		});
	};

	const handlePrevious = useCallback(() => {
		// Map selected team IDs to team objects
		const selectedTeams = teams?.filter((team) => selectedTeamIds.includes(team.id)) || [];

		goToPrevious?.({
			members,
			relations: relations.filter((el) => el.projectId && el.relationType),
			teams: selectedTeams
		});
	}, [goToPrevious, members, relations, selectedTeamIds, teams]);

	return (
		<form onSubmit={handleSubmit} className="w-full pt-4 space-y-5">
			{/* Teams Multi-Select Section */}
			<div className="flex flex-col w-full gap-2">
				<label className={modalFieldLabelClass}>
					{t('pages.projects.teamAndRelationsForm.formFields.assignTeams')}
					<span className="ml-1 text-destructive-ink">*</span>
				</label>
				<div className="flex flex-wrap gap-2 p-3 rounded-lg min-h-[60px] bg-foreground/[0.03]">
					{teams?.length ? (
						teams.map((team) => {
							const isSelected = selectedTeamIds.includes(team.id);
							const isActiveTeam = team.id === activeTeam?.id;
							const isLocked = isActiveTeam && !canDeselectTeam(team.id);
							const isLockedSelection = isLocked && isSelected;
							const isUnlockedSelection = isSelected && !isLocked;

							return (
								<button
									key={team.id}
									type="button"
									onClick={() => handleToggleTeam(team.id)}
									disabled={isLocked && isSelected}
									className={cn(
										'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25',
										isSelected && 'bg-primary text-primary-foreground',
										!isSelected &&
											'bg-card text-foreground shadow-sm shadow-black/10 hairline-ring ring-foreground/10 hover:bg-muted/50 dark:ring-foreground/15',
										isLockedSelection && 'cursor-not-allowed opacity-80'
									)}
									title={
										isLocked
											? t('pages.projects.teamAndRelationsForm.formFields.activeTeamLocked')
											: undefined
									}
								>
									{team.emoji && <span>{team.emoji}</span>}
									<span>{team.name}</span>
									{isLockedSelection && <Lock className="size-3" />}
									{isUnlockedSelection && <Check className="size-3" />}
								</button>
							);
						})
					) : (
						<span className="text-xs text-muted-foreground">
							{t('pages.projects.teamAndRelationsForm.formFields.noTeamsAvailable')}
						</span>
					)}
				</div>
				{teamError && <span className="text-xs text-destructive-ink">{teamError}</span>}
				<span className="text-xs text-muted-foreground">
					{t('pages.projects.teamAndRelationsForm.formFields.teamsHelperText')}
				</span>
			</div>

			{/* Members Section */}
			<div className="flex flex-col w-full gap-2">
				<label className={modalFieldLabelClass}>
					{t('pages.projects.teamAndRelationsForm.formFields.assignMembers')}
				</label>
				<div className="flex flex-col w-full gap-2">
					<div className="flex flex-col w-full gap-1">
						{members.length ? (
							members.map((el) => (
								<PairingItem
									selected={[el.memberId, resolveProjectRoleId(el.roleId, rolesFromApi)]}
									keys={allMembers}
									values={availableRoles}
									onRemove={handleRemoveMember}
									// PairingItem copies `selected` once: remount it when the loaded roles replace the fallback ones.
									key={rolesFromApi.length ? el.id : `${el.id}-fallback`}
									id={el.id}
									keysLabel={t('pages.projects.teamAndRelationsForm.formFields.selectMember')}
									valuesLabel={t('pages.projects.teamAndRelationsForm.formFields.selectRole')}
									onKeyChange={(itemId, memberId) =>
										setMembers((prev) =>
											prev.map((el) => {
												if (el.id === itemId) {
													return { ...el, memberId };
												}
												return el;
											})
										)
									}
									onValueChange={(itemId, roleId) =>
										setMembers((prev) =>
											prev.map((el) => {
												if (el.id === itemId) {
													return { ...el, roleId };
												}
												return el;
											})
										)
									}
								/>
							))
						) : (
							<span className="text-xs text-muted-foreground">
								{t('pages.projects.teamAndRelationsForm.formFields.noMembers')}
							</span>
						)}
					</div>
					<Button
						type="button"
						className="self-start"
						variant="outline"
						size="default"
						onClick={handleAddNewMember}
					>
						<Plus /> <span>{t('pages.projects.teamAndRelationsForm.formFields.addMember')}</span>
					</Button>
				</div>
			</div>
			{
				// Will be implemented later on the api side (we keep this here)
			}
			<div className="flex-col hidden w-full gap-2">
				<label className={modalFieldLabelClass}>
					{t('pages.projects.teamAndRelationsForm.formFields.relations')}
				</label>
				<div className="flex flex-col w-full gap-2">
					<div className="flex flex-col w-full gap-1">
						{relations.length ? (
							relations.map((el) => (
								<PairingItem
									keys={organizationProjects?.map((el) => ({
										id: el.id,
										value: el.name ?? '-',
										imgUrl: el.imageUrl ?? undefined
									}))}
									values={relationsData.map((el) => ({
										id: el,
										value: el
									}))}
									selected={[el.projectId, el.relationType ?? '']}
									onRemove={handleRemoveRelation}
									key={el.id}
									id={el.id}
									keysLabel={t('pages.projects.teamAndRelationsForm.formFields.selectProject')}
									valuesLabel={t('pages.projects.teamAndRelationsForm.formFields.selectRelationType')}
									onKeyChange={(itemId, projectId) =>
										setRelations((prev) =>
											prev.map((el) => {
												if (el.id === itemId) {
													return { ...el, projectId };
												}
												return el;
											})
										)
									}
									onValueChange={(itemId, relationType) =>
										setRelations((prev) =>
											prev.map((el) => {
												if (el.id === itemId) {
													return { ...el, relationType: relationType as EProjectRelation };
												}
												return el;
											})
										)
									}
								/>
							))
						) : (
							<span className="text-xs text-muted-foreground">
								{t('pages.projects.teamAndRelationsForm.formFields.noRelations')}
							</span>
						)}
					</div>
					<Button
						type="button"
						className="self-start"
						variant="outline"
						size="default"
						onClick={handleAddNewRelation}
					>
						<Plus /> <span>{t('pages.projects.teamAndRelationsForm.formFields.addRelation')}</span>
					</Button>
				</div>
			</div>

			<div className={cn(modalFooterClass, 'hairline-t border-border pt-4')}>
				<Button
					onClick={handlePrevious}
					variant="ghost"
					size="default"
					className={modalSecondaryActionClass}
					type="button"
				>
					{t('common.BACK')}
				</Button>
				<Button type="submit" size="default" className={modalPrimaryActionClass}>
					{t('common.NEXT')}
				</Button>
			</div>
		</form>
	);
}

interface IPairingItemProps<K extends Identifiable, V extends Identifiable> {
	id: string;
	onRemove: (id: string) => void;
	keys: (K & { imgUrl?: string })[];
	values: V[];
	keysLabel?: string;
	selected: [string, string];
	valuesLabel?: string;
	onKeyChange?: (id: string, key: string) => void;
	onValueChange?: (id: string, value: string) => void;
}

function PairingItem<K extends Identifiable, V extends Identifiable>(props: IPairingItemProps<K, V>) {
	const { id, onRemove, keys, values, keysLabel, valuesLabel, onKeyChange, onValueChange, selected } = props;
	const [keyId, setKeyId] = useState<string | null>(selected[0] || null);
	const [valueId, setValueId] = useState<string | null>(selected[1] || null);

	// Select is memoized: a stable renderer keeps it from re-rendering with every row of the form
	const renderKeyItem = useCallback(
		(item: K & { imgUrl?: string }, isSelected: boolean) => (
			<div
				className={cn(
					'flex w-full h-full items-center gap-2 rounded-md p-1 px-2',
					isSelected && 'bg-primary/10 font-medium text-primary-ink'
				)}
			>
				{isSelected && <Check className="size-3" />}
				<span className={cn('  flex items-center gap-2', keyId && !isSelected && 'pl-[18px]')}>
					<Thumbnail
						className="z-20 rounded-full bg-card text-foreground"
						imgUrl={item?.imgUrl}
						size={'20px'}
						identifier={String(item?.value)}
					/>
					<span className="capitalize">{item?.value ?? '-'}</span>
				</span>
			</div>
		),
		[keyId]
	);

	const handleKeyChange = useCallback(
		(nextKeyId: unknown) => {
			const selectedKeyId = nextKeyId as string;
			onKeyChange?.(id, selectedKeyId);
			setKeyId(selectedKeyId);
		},
		[id, onKeyChange]
	);

	const handleValueChange = useCallback(
		(nextValueId: unknown) => {
			const selectedValueId = nextValueId as string;
			onValueChange?.(id, selectedValueId);
			setValueId(selectedValueId);
		},
		[id, onValueChange]
	);

	return (
		<div className="flex items-center w-full gap-3">
			<div className="w-full">
				<Select
					placeholder={keysLabel}
					selectTriggerClassName="w-full"
					options={keys}
					onChange={handleKeyChange}
					selected={keyId}
					renderItem={renderKeyItem}
				/>
			</div>

			<div className="w-full">
				<Select
					placeholder={valuesLabel}
					selectTriggerClassName="w-full"
					options={values}
					onChange={handleValueChange}
					selected={valueId}
				/>
			</div>

			<button
				type="button"
				onClick={() => onRemove(id)}
				className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'shrink-0 text-muted-foreground')}
			>
				<X />
			</button>
		</div>
	);
}
