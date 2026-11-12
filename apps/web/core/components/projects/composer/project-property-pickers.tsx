'use client';

import { useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Building, Lock, Plus, Refresh, Tag, X } from '@/core/components/icons';
import { MUTED_VALUE, PersonFace, ProjectStatusChip, teamImageOf } from '@/core/components/projects/project-cells';
import { dataColorDotStyle, isPaintableColor } from '@/core/components/tasks/task-data-color';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import {
	TaskPropertyMenu,
	TaskPropertyMenuAction,
	type TaskPropertyMenuOption
} from '@/core/components/tasks/task-property-menu';
import { cn } from '@/core/lib/helpers';
import { hasClientNamed, type ClientListState } from '@/core/lib/utils/clients';
import {
	PROJECT_STATUS_LABEL_KEYS,
	PROJECT_STATUS_VALUES,
	type ProjectPersonOption
} from '@/core/lib/utils/project-composer';
import { findStatusByName, normalizeStatusName } from '@/core/lib/utils/project-list';
import type { TClient, TTag } from '@/core/types/schemas';
import type { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';
import {
	ADD_ROUND_BUTTON,
	CHIP_REMOVE_BUTTON,
	ENTITY_CHIP,
	PERSON_CHIP,
	VALUE_BUTTON,
	VALUE_CHIP
} from './composer-recipes';

const MAX_PEOPLE_CHIPS = 6;

function RemoveChipButton({ label, onRemove }: Readonly<{ label: string; onRemove: () => void }>) {
	return (
		<button type="button" onClick={onRemove} aria-label={label} className={CHIP_REMOVE_BUTTON}>
			<X aria-hidden="true" />
		</button>
	);
}

function AddRoundTrigger() {
	return (
		<span className={ADD_ROUND_BUTTON}>
			<Plus aria-hidden="true" />
		</span>
	);
}

function AddTextTrigger({ label }: Readonly<{ label: string }>) {
	return (
		<span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground/80">
			<Plus aria-hidden="true" className="size-3.5" />
			{label}
		</span>
	);
}

export function ProjectStatusPicker({
	status,
	statuses,
	onChange
}: Readonly<{ status: string | null; statuses: TTaskStatus[]; onChange: (status: string) => void }>) {
	const t = useTranslations();
	const options = useMemo<TaskPropertyMenuOption<string>[]>(
		() =>
			PROJECT_STATUS_VALUES.map((value) => {
				const match = findStatusByName(statuses, value);
				return {
					key: value,
					value,
					label: t(PROJECT_STATUS_LABEL_KEYS[value]),
					icon: <TaskPropertyIcon kind="status" name={value} color={match?.color} className="size-3.5" />
				};
			}),
		[statuses, t]
	);
	const wanted = normalizeStatusName(status);
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={(value) => normalizeStatusName(value) === wanted}
			onSelect={onChange}
			searchPlaceholder={t('taskMenus.search.status')}
			triggerLabel={t('common.STATUS')}
			triggerClassName={VALUE_BUTTON}
			popupClassName="w-56"
		>
			<ProjectStatusChip statusName={status} statuses={statuses} />
		</TaskPropertyMenu>
	);
}

interface ProjectTeamsPickerProps {
	teams: TOrganizationTeam[];
	selectedTeamIds: string[];
	canDeselect: (teamId: string) => boolean;
	onToggle: (teamId: string) => void;
}

export function ProjectTeamsPicker({
	teams,
	selectedTeamIds,
	canDeselect,
	onToggle
}: Readonly<ProjectTeamsPickerProps>) {
	const t = useTranslations();
	const selectedTeams = teams.filter((team) => selectedTeamIds.includes(team.id));
	const canAddTeams = teams.length > selectedTeams.length;
	const options = useMemo<TaskPropertyMenuOption<string>[]>(
		() =>
			teams.map((team) => ({
				key: team.id,
				value: team.id,
				label: team.name,
				icon: (
					<EntityTile
						name={team.name}
						color={team.color}
						imageUrl={teamImageOf(team)}
						className="size-4 text-[7px]"
					/>
				)
			})),
		[teams]
	);
	const hasSelection = selectedTeams.length > 0;
	return (
		<>
			{!hasSelection && <span className={MUTED_VALUE}>{t('pages.projects.detail.NO_TEAM')}</span>}
			{selectedTeams.map((team) => {
				const isLocked = !canDeselect(team.id);
				return (
					<span key={team.id} className={cn(VALUE_CHIP, ENTITY_CHIP)}>
						<EntityTile
							name={team.name}
							color={team.color}
							imageUrl={teamImageOf(team)}
							className="size-4 text-[7px]"
						/>
						<span className="truncate">{team.name}</span>
						{isLocked && (
							<Tooltip>
								<TooltipTrigger
									render={
										<button
											type="button"
											aria-label={t(
												'pages.projects.teamAndRelationsForm.formFields.activeTeamLocked'
											)}
											className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3"
										/>
									}
								>
									<Lock aria-hidden="true" />
								</TooltipTrigger>
								<TooltipContent>
									{t('pages.projects.teamAndRelationsForm.formFields.activeTeamLocked')}
								</TooltipContent>
							</Tooltip>
						)}
						{!isLocked && (
							<RemoveChipButton
								label={t('pages.projects.modals.removeItem', { name: team.name })}
								onRemove={() => onToggle(team.id)}
							/>
						)}
					</span>
				);
			})}
			{canAddTeams && (
				<TaskPropertyMenu
					options={options}
					isSelected={(value) => selectedTeamIds.includes(value)}
					onSelect={onToggle}
					multiple
					searchPlaceholder={t('pages.projects.modals.teams.search')}
					triggerLabel={t('pages.projects.modals.teams.add')}
					triggerClassName="rounded-full"
					popupClassName="w-60"
				>
					<AddRoundTrigger />
				</TaskPropertyMenu>
			)}
		</>
	);
}

interface ProjectPeoplePickerProps {
	people: ProjectPersonOption[];
	selectedIds: string[];
	addLabel: string;
	searchPlaceholder: string;
	onToggle: (employeeId: string) => void;
}

function personOptionOf(person: ProjectPersonOption): TaskPropertyMenuOption<string> {
	return {
		key: person.id,
		value: person.id,
		label: person.name,
		icon: <PersonFace person={person} className="size-4" />
	};
}

export function ProjectPeoplePicker({
	people,
	selectedIds,
	addLabel,
	searchPlaceholder,
	onToggle
}: Readonly<ProjectPeoplePickerProps>) {
	const t = useTranslations();
	const options = useMemo(() => people.map(personOptionOf), [people]);
	const selectedPeople = people.filter((person) => selectedIds.includes(person.id));
	const shownPeople = selectedPeople.slice(0, MAX_PEOPLE_CHIPS);
	const hiddenCount = selectedPeople.length - shownPeople.length;
	const hasHiddenPeople = hiddenCount > 0;
	const hasSelection = selectedPeople.length > 0;
	let trigger: ReactNode = <AddTextTrigger label={addLabel} />;
	let triggerClassName = VALUE_BUTTON;
	if (hasSelection) {
		trigger = <AddRoundTrigger />;
		triggerClassName = 'rounded-full';
	}
	return (
		<>
			{shownPeople.map((person) => (
				<span key={person.id} className={cn(VALUE_CHIP, PERSON_CHIP)}>
					<PersonFace person={person} className="size-5" />
					<span className="truncate">{person.name}</span>
					<RemoveChipButton
						label={t('pages.projects.modals.removeItem', { name: person.name })}
						onRemove={() => onToggle(person.id)}
					/>
				</span>
			))}
			{hasHiddenPeople && (
				<span className={cn(VALUE_CHIP, 'rounded-full px-2 tabular-nums text-muted-foreground')}>
					+{hiddenCount}
				</span>
			)}
			<TaskPropertyMenu
				options={options}
				isSelected={(value) => selectedIds.includes(value)}
				onSelect={onToggle}
				multiple
				searchPlaceholder={searchPlaceholder}
				triggerLabel={addLabel}
				triggerClassName={triggerClassName}
				popupClassName="w-64"
			>
				{trigger}
			</TaskPropertyMenu>
		</>
	);
}

function TagDot({ color }: Readonly<{ color: string | null | undefined }>) {
	if (!isPaintableColor(color)) {
		return (
			<span aria-hidden="true" className="size-2 shrink-0 rounded-full hairline-border border-foreground/40" />
		);
	}
	return <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={dataColorDotStyle(color)} />;
}

function hasTagNamed(tags: TTag[], query: string) {
	const wanted = query.trim().toLowerCase();
	return tags.some((tag) => tag.name.trim().toLowerCase() === wanted);
}

interface ProjectTagsPickerProps {
	tags: TTag[];
	selectedTagIds: string[];
	isCreating: boolean;
	onToggle: (tagId: string) => void;
	onCreate: (name: string) => void;
}

export function ProjectTagsPicker({
	tags,
	selectedTagIds,
	isCreating,
	onToggle,
	onCreate
}: Readonly<ProjectTagsPickerProps>) {
	const t = useTranslations();
	const options = useMemo<TaskPropertyMenuOption<string>[]>(
		() => tags.map((tag) => ({ key: tag.id, value: tag.id, label: tag.name, icon: <TagDot color={tag.color} /> })),
		[tags]
	);
	const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
	const hasSelection = selectedTags.length > 0;
	let addLabel = t('pages.projects.modals.tags.add');
	if (hasSelection) {
		addLabel = t('pages.projects.modals.tags.addMore');
	}

	const renderCreateRow = (query: string) => {
		const name = query.trim();
		const canCreate = name.length > 0 && !hasTagNamed(tags, name);
		if (!canCreate) {
			return null;
		}
		return (
			<TaskPropertyMenuAction icon={<Tag />} onClick={() => onCreate(name)} disabled={isCreating}>
				{t('pages.projects.modals.tags.create', { name })}
			</TaskPropertyMenuAction>
		);
	};

	return (
		<>
			{selectedTags.map((tag) => (
				<span key={tag.id} className={cn(VALUE_CHIP, 'rounded-md pr-1 pl-2')}>
					<TagDot color={tag.color} />
					<span className="truncate">{tag.name}</span>
					<RemoveChipButton
						label={t('pages.projects.modals.removeItem', { name: tag.name })}
						onRemove={() => onToggle(tag.id)}
					/>
				</span>
			))}
			<TaskPropertyMenu
				options={options}
				isSelected={(value) => selectedTagIds.includes(value)}
				onSelect={onToggle}
				multiple
				searchPlaceholder={t('pages.projects.categorizationForm.formFields.tagsPlaceholder')}
				triggerLabel={addLabel}
				triggerClassName={VALUE_BUTTON}
				popupClassName="w-60"
				footer={renderCreateRow}
			>
				<AddTextTrigger label={addLabel} />
			</TaskPropertyMenu>
		</>
	);
}

export interface SelectedProjectClient {
	id: string;
	name: string;
	isArchived: boolean;
}

const CLIENT_LIST_NOTE = 'flex min-h-8 items-center px-2 py-1.5 text-[13px] leading-5 text-muted-foreground';

interface ProjectClientPickerProps {
	/** The clients on offer: the active ones. */
	clients: TClient[];
	listState: ClientListState;
	selectedClient: SelectedProjectClient | null;
	canCreate: boolean;
	isCreating: boolean;
	onSelect: (clientId: string) => void;
	onClear: () => void;
	onCreate: (name: string) => void;
	onRetry: () => void;
}

function clientOptionOf(client: TClient): TaskPropertyMenuOption<string> {
	return {
		key: client.id,
		value: client.id,
		label: client.name,
		icon: <EntityTile name={client.name} imageUrl={client.imageUrl} className="size-4 text-[7px]" />
	};
}

export function ProjectClientPicker({
	clients,
	listState,
	selectedClient,
	canCreate,
	isCreating,
	onSelect,
	onClear,
	onCreate,
	onRetry
}: Readonly<ProjectClientPickerProps>) {
	const t = useTranslations();
	const options = useMemo(() => clients.map(clientOptionOf), [clients]);
	const selectedId = selectedClient?.id;
	// A client the viewer may not read has no name here; it is still shown as set.
	const selectedName = selectedClient?.name || t('common.CLIENT');
	let triggerLabel = t('clients.picker.ADD');
	if (selectedClient) {
		triggerLabel = t('clients.picker.CHANGE');
	}

	const renderCreateRow = (query: string) => {
		const name = query.trim();
		const isNewName = name.length > 0 && !hasClientNamed(clients, name);
		const showsCreate = canCreate && isNewName;
		if (!showsCreate) {
			return null;
		}
		return (
			<TaskPropertyMenuAction icon={<Building />} onClick={() => onCreate(name)} disabled={isCreating}>
				{t('clients.picker.CREATE', { name })}
			</TaskPropertyMenuAction>
		);
	};

	const renderFooter = (query: string) => {
		if (listState === 'loading') {
			return <p className={CLIENT_LIST_NOTE}>{t('common.LOADING')}</p>;
		}
		if (listState === 'failed') {
			return (
				<>
					<p role="alert" className={CLIENT_LIST_NOTE}>
						{t('clients.ERROR_TITLE')}
					</p>
					<TaskPropertyMenuAction icon={<Refresh />} onClick={onRetry}>
						{t('pages.unauthorized.TRY_AGAIN')}
					</TaskPropertyMenuAction>
				</>
			);
		}
		return renderCreateRow(query);
	};

	return (
		<>
			<TaskPropertyMenu
				options={options}
				isSelected={(value) => value === selectedId}
				onSelect={onSelect}
				searchPlaceholder={t('clients.SEARCH_PLACEHOLDER')}
				triggerLabel={triggerLabel}
				triggerClassName={VALUE_BUTTON}
				popupClassName="w-60"
				footer={renderFooter}
			>
				{selectedClient && (
					<>
						<EntityTile name={selectedName} className="size-4 text-[7px]" />
						<span className="truncate">{selectedName}</span>
					</>
				)}
				{!selectedClient && <AddTextTrigger label={t('clients.picker.ADD')} />}
			</TaskPropertyMenu>
			{selectedClient?.isArchived && (
				<span className="text-xs text-muted-foreground">{t('clients.SCOPE_ARCHIVED')}</span>
			)}
			{selectedClient && (
				<RemoveChipButton
					label={t('pages.projects.modals.removeItem', { name: selectedName })}
					onRemove={onClear}
				/>
			)}
		</>
	);
}
