'use client';

import {
	useMemo,
	useState,
	type Dispatch,
	type FormEventHandler,
	type KeyboardEvent,
	type SetStateAction
} from 'react';
import { useTranslations } from 'next-intl';
import { Building, ChevronDown, Search } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { EntityTile } from '@/core/components/common/entity-tile';
import { RadioMark } from '@/core/components/common/radio-mark';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { controlGroupRecipe } from '@/core/components/common/input';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { AUTH_CONTROL_HEIGHT, AUTH_QUIET_LINK } from '@/core/components/auth/kit/auth-recipes';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { getFirstTeamId, hasTeams, isWorkspaceNotSetUp, workspaceHasTeam } from '@/core/lib/utils/workspace.utils';
import { cn } from '@/core/lib/helpers';
import { setPathAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { CREATE_WORKSPACE_PATH } from '@/core/hooks/auth/use-create-workspace';

export type WorkspacePickerProps = {
	className?: string;
	workspaces: ISigninEmailConfirmWorkspaces[];
	onSubmit?: FormEventHandler<HTMLFormElement>;
	onBackButtonClick?: () => void;
	selectedWorkspace: number;
	setSelectedWorkspace: Dispatch<SetStateAction<number>>;
	signInWorkspaceLoading?: boolean;
	setSelectedTeam: Dispatch<SetStateAction<string>>;
	selectedTeam: string;
	/** The workspaces carry no team list (an Ever ID sign-in): list them without empty-workspace warnings. */
	teamsUnavailable?: boolean;
	/** The workspaces with no tenant yet, when the list cannot show it (an Ever ID sign-in fills a missing tenant). */
	notSetUpIndices?: readonly number[];
};

type PickableWorkspace = {
	workspace: ISigninEmailConfirmWorkspaces;
	originalIndex: number;
	hasTeams: boolean;
	teamCount: number;
};

const SEARCH_FROM = 7;

const DIGIT_KEY = /^[1-9]$/;

/**
 * The workspaces a person can pick. With at least one workspace that has teams, the empty ones are hidden so they do
 * not confuse; when all are empty they are all listed, with a warning, so the person can still go on and create a
 * team. The original index maps a row back to the API's list.
 */
function pickableWorkspacesOf(workspaces: ISigninEmailConfirmWorkspaces[], teamsUnavailable?: boolean) {
	const withUser = workspaces
		.map((workspace, index) => ({ workspace, originalIndex: index }))
		.filter(({ workspace }) => workspace?.user);

	if (teamsUnavailable) {
		return withUser.map(({ workspace, originalIndex }) => ({
			workspace: { ...workspace, current_teams: workspace.current_teams ?? [] },
			originalIndex,
			hasTeams: true,
			teamCount: 0
		}));
	}

	const someHaveTeams = withUser.some(({ workspace }) => hasTeams(workspace));
	let shown = withUser;
	if (someHaveTeams) {
		shown = withUser.filter(({ workspace }) => hasTeams(workspace));
	}
	return shown.map(({ workspace, originalIndex }) => ({
		workspace,
		originalIndex,
		hasTeams: hasTeams(workspace),
		teamCount: workspace.current_teams?.length || 0
	}));
}

export function workspaceNameOf(workspace: ISigninEmailConfirmWorkspaces | undefined) {
	if (!workspace) {
		return '';
	}
	return workspace.user?.tenant?.name || workspace.user?.name || 'Workspace';
}

function matchesQuery(item: PickableWorkspace, query: string) {
	const name = workspaceNameOf(item.workspace).toLowerCase();
	return name.includes(query);
}

function memberCountOf(count: string | number | undefined) {
	const parsed = Number(count);
	if (Number.isNaN(parsed)) {
		return 0;
	}
	return parsed;
}

function rowStateClass(isSelected: boolean, isEmpty: boolean) {
	if (isSelected && isEmpty) {
		return 'bg-warning/[0.08]';
	}
	if (isSelected) {
		return 'bg-primary/[0.06]';
	}
	return 'hover:bg-foreground/[0.03]';
}

/** A row without a team list opens nothing, so it states no expanded state. */
function expandedStateOf(showsTeams: boolean, hasTeamList: boolean) {
	if (!hasTeamList) {
		return undefined;
	}
	return showsTeams;
}

/** Enter in the search would sign in to the selected workspace, which the query may be hiding. */
function keepSearchFromSubmitting(event: KeyboardEvent<HTMLInputElement>) {
	const isEnter = event.key === 'Enter';
	const isComposing = event.nativeEvent.isComposing;
	if (!isEnter || isComposing) {
		return;
	}
	event.preventDefault();
}

function focusNeighbourRow(event: KeyboardEvent<HTMLDivElement>, offset: number) {
	const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[data-picker-row]'));
	const current = rows.indexOf(document.activeElement as HTMLButtonElement);
	const next = rows[current + offset];
	if (!next) {
		return;
	}
	event.preventDefault();
	next.focus();
}

export function WorkspacePicker(props: Readonly<WorkspacePickerProps>) {
	const t = useTranslations();
	const [expandedWorkspace, setExpandedWorkspace] = useState<number | null>(props.selectedWorkspace);
	const [expandedFor, setExpandedFor] = useState(props.selectedWorkspace);
	const [query, setQuery] = useState('');

	// A workspace picked from outside (the remembered team, an Ever ID hint) opens its teams
	if (expandedFor !== props.selectedWorkspace) {
		setExpandedFor(props.selectedWorkspace);
		setExpandedWorkspace(props.selectedWorkspace);
	}

	const pickable = useMemo(
		() => pickableWorkspacesOf(props.workspaces, props.teamsUnavailable),
		[props.workspaces, props.teamsUnavailable]
	);
	const normalizedQuery = query.trim().toLowerCase();
	const hasQuery = normalizedQuery.length > 0;
	const shown = pickable.filter((item) => matchesQuery(item, normalizedQuery));
	const showsSearch = pickable.length >= SEARCH_FROM;
	const hasNoMatch = hasQuery && shown.length === 0;
	const selectedItem = pickable.find((item) => item.originalIndex === props.selectedWorkspace);
	const isSelectedEmpty = Boolean(selectedItem && !selectedItem.hasTeams);
	const accountEmail = pickable[0]?.workspace.user?.email ?? '';
	const isSubmitting = Boolean(props.signInWorkspaceLoading);
	const hasListedSelection = Boolean(selectedItem);
	const isContinueDisabled = isSubmitting || !hasListedSelection;

	const selectWorkspace = (item: PickableWorkspace) => {
		const isAlreadySelected = props.selectedWorkspace === item.originalIndex;
		if (isAlreadySelected) {
			setExpandedWorkspace((current) => {
				if (current === item.originalIndex) {
					return null;
				}
				return item.originalIndex;
			});
			return;
		}
		props.setSelectedWorkspace(item.originalIndex);
		setExpandedWorkspace(item.originalIndex);
		const keepsTeam = workspaceHasTeam(item.workspace, props.selectedTeam);
		const shouldPickFirstTeam = item.hasTeams && Boolean(props.selectedTeam) && !keepsTeam;
		if (!shouldPickFirstTeam) {
			return;
		}
		const firstTeamId = getFirstTeamId(item.workspace);
		if (firstTeamId) {
			props.setSelectedTeam(firstTeamId);
		}
	};

	const selectTeam = (teamId: string, originalIndex: number) => {
		props.setSelectedTeam(teamId);
		if (props.selectedWorkspace !== originalIndex) {
			props.setSelectedWorkspace(originalIndex);
		}
	};

	const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'ArrowDown') {
			focusNeighbourRow(event, 1);
			return;
		}
		if (event.key === 'ArrowUp') {
			focusNeighbourRow(event, -1);
			return;
		}
		const isDigit = DIGIT_KEY.test(event.key);
		const hasModifier = event.metaKey || event.ctrlKey || event.altKey;
		if (!isDigit || hasModifier) {
			return;
		}
		const item = shown[Number(event.key) - 1];
		if (!item) {
			return;
		}
		event.preventDefault();
		selectWorkspace(item);
	};

	return (
		<form className={cn('flex w-full flex-col', props.className)} onSubmit={props.onSubmit} autoComplete="off">
			<AuthHeading
				mark={
					<AuthMark>
						<Building />
					</AuthMark>
				}
				title={t('auth.workspace.TITLE')}
				description={t('auth.workspace.DESCRIPTION')}
				className="mb-6"
			/>

			{accountEmail && (
				<div className="mb-4 flex items-center gap-3 rounded-xl bg-foreground/[0.03] px-3 py-2.5">
					<div className="flex min-w-0 flex-1 flex-col">
						<span className="text-xs text-muted-foreground">{t('auth.workspace.SIGNED_IN_AS')}</span>
						<span className="truncate text-[13px] font-medium text-foreground">{accountEmail}</span>
					</div>
					{props.onBackButtonClick && (
						<button
							type="button"
							onClick={() => {
								// Leaving the list drops what "Create a new workspace" set for this sign-in
								setPathAfterSignIn(null);
								props.onBackButtonClick?.();
							}}
							className={AUTH_QUIET_LINK}
						>
							{t('auth.workspace.NOT_YOU')}
						</button>
					)}
				</div>
			)}

			{showsSearch && (
				<label className={cn(controlGroupRecipe, AUTH_CONTROL_HEIGHT, 'mb-3 gap-2 px-2.5')}>
					<Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
					<span className="sr-only">{t('auth.workspace.SEARCH')}</span>
					<input
						type="search"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={keepSearchFromSubmitting}
						placeholder={t('auth.workspace.SEARCH')}
						className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/75 md:text-sm"
					/>
				</label>
			)}

			{isSelectedEmpty && (
				<AuthNotice tone="warning" title={t('pages.auth.EMPTY_WORKSPACE_WARNING_TITLE')} className="mb-3">
					{t('pages.auth.EMPTY_WORKSPACE_WARNING_MESSAGE')}
				</AuthNotice>
			)}

			<div
				onKeyDown={handleListKeyDown}
				className="-mx-2.5 flex max-h-[22rem] flex-col gap-0.5 overflow-y-auto px-0.5 py-0.5"
			>
				{shown.map((item, position) => {
					const { workspace, originalIndex } = item;
					const isEmpty = !item.hasTeams;
					const isSelected = props.selectedWorkspace === originalIndex;
					const isExpanded = expandedWorkspace === originalIndex;
					const showsTeams = isExpanded && !props.teamsUnavailable;
					const showsTeamCount = !isEmpty && item.teamCount > 0;
					const isNotSetUp = isWorkspaceNotSetUp(workspace, originalIndex, props.notSetUpIndices);
					const workspaceName = isNotSetUp ? t('pages.auth.WORKSPACE_NOT_SET_UP') : workspaceNameOf(workspace);
					const keyLabel = position + 1;
					const hasKeyCap = keyLabel <= 9;
					const isDimmed = isSubmitting && !isSelected;
					const teams = (workspace.current_teams ?? []).filter((team) => team && team.team_name);
					const hasTeamList = teams.length > 0 && !props.teamsUnavailable;
					const showsKeyCap = !isSelected && hasKeyCap;
					const expandedState = expandedStateOf(showsTeams, hasTeamList);

					return (
						<div
							key={originalIndex}
							className={cn('flex flex-col transition-opacity duration-150', isDimmed && 'opacity-50')}
						>
							<button
								type="button"
								data-picker-row=""
								aria-pressed={isSelected}
								aria-expanded={expandedState}
								disabled={isSubmitting}
								onClick={() => selectWorkspace(item)}
								className={cn(
									'flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/25',
									rowStateClass(isSelected, isEmpty)
								)}
							>
								<EntityTile
									name={workspaceName}
									imageUrl={workspace.user?.tenant?.logo}
									className="size-8 text-[11px]"
								/>
								<span className="flex min-w-0 flex-1 flex-col">
									<span className="truncate text-[13px] font-medium text-foreground">
										{workspaceName}
									</span>
									{showsTeamCount && (
										<span className="text-xs text-muted-foreground tabular-nums">
											{t('auth.workspace.TEAM_COUNT', { count: item.teamCount })}
										</span>
									)}
									{isEmpty && (
										<span className="text-xs text-warning-foreground">
											{t('pages.auth.NO_TEAMS_BADGE')}
										</span>
									)}
								</span>
								{isSelected && <SelectedMark />}
								{showsKeyCap && (
									<kbd
										aria-hidden="true"
										className="hidden h-5 min-w-5 items-center justify-center rounded-[5px] px-1 font-sans text-[11px] font-medium text-muted-foreground keycap-3d sm:inline-flex"
									>
										{keyLabel}
									</kbd>
								)}
								{hasTeamList && (
									<ChevronDown
										aria-hidden="true"
										className={cn(
											'size-4 shrink-0 text-muted-foreground transition-transform duration-200',
											showsTeams && 'rotate-180'
										)}
									/>
								)}
							</button>

							{teams.length > 0 && (
								<AnimatedHeight>
									{showsTeams && (
										<div
											role="group"
											aria-label={t('auth.workspace.TEAMS_OF', { workspace: workspaceName })}
											className="mt-0.5 mb-1 ml-6 flex flex-col gap-0.5 pl-3 hairline-l border-foreground/10"
										>
											{teams.map((team) => {
												const isTeamSelected = props.selectedTeam === team.team_id;
												const memberCount = memberCountOf(team.team_member_count);
												return (
													<button
														key={`${originalIndex}-${team.team_id}`}
														type="button"
														data-picker-row=""
														aria-pressed={isTeamSelected}
														disabled={isSubmitting}
														onClick={() => selectTeam(team.team_id, originalIndex)}
														className={cn(
															'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-left outline-none transition-colors duration-150 hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25',
															isTeamSelected && 'bg-foreground/[0.04]'
														)}
													>
														<EntityTile name={team.team_name} imageUrl={team.team_logo} />
														<span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
															{team.team_name}
														</span>
														<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
															{t('auth.scene.MEMBER_COUNT', { count: memberCount })}
														</span>
														<RadioMark isChecked={isTeamSelected} />
													</button>
												);
											})}
										</div>
									)}
								</AnimatedHeight>
							)}
						</div>
					);
				})}

				{hasNoMatch && (
					<div className="flex flex-col items-start gap-1 px-2.5 py-4">
						<p className="text-[13px] font-medium text-foreground">
							{t('auth.workspace.NO_MATCH_TITLE', { query: query.trim() })}
						</p>
						<p className="text-xs text-muted-foreground">{t('auth.workspace.NO_MATCH_TEXT')}</p>
					</div>
				)}
			</div>

			<Button
				type="submit"
				loading={props.signInWorkspaceLoading}
				disabled={isContinueDisabled}
				id="continue-to-workspace"
				className="mt-6 w-full max-sm:h-11"
				onClick={() => setPathAfterSignIn(null)}
			>
				{t('common.CONTINUE')}
			</Button>
			{/* Signs in to the chosen workspace, then opens the creation of another one (#5025) */}
			<button
				type="submit"
				disabled={isContinueDisabled || props.signInWorkspaceLoading}
				onClick={() => setPathAfterSignIn(CREATE_WORKSPACE_PATH)}
				className={cn(AUTH_QUIET_LINK, 'mt-3 self-center disabled:opacity-50')}
			>
				{t('auth.workspace.CREATE_NEW')}
			</button>
		</form>
	);
}
