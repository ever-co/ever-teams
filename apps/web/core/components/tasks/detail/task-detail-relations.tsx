'use client';

import { useMemo, type ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { ChevronsUpDown, Plus, X } from '@/core/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { TaskPropertyMenu, type TaskPropertyMenuOption } from '@/core/components/tasks/task-property-menu';
import { useLiveTaskId } from '@/core/hooks/tasks/use-live-task-id';
import { useTaskRelations } from '@/core/hooks/tasks/use-task-relations';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { cn } from '@/core/lib/helpers';
import { relationCandidatesOf } from '@/core/lib/utils/task-detail';
import { tasksByTeamState } from '@/core/stores';
import { ERelatedIssuesRelation } from '@/core/types/generics/enums/task';
import type { ITaskLinkedIssue } from '@/core/types/interfaces/task/task-linked-issue';
import type { TTask } from '@/core/types/schemas/task/task.schema';
import {
	DETAIL_ADD_ROW,
	DETAIL_GHOST_ACTION,
	DETAIL_ICON_ACTION,
	DETAIL_LIST_SURFACE,
	DETAIL_ROW_ACTION
} from './task-detail-recipes';
import { TaskDetailSection } from './task-detail-section';
import { TaskIssueRow, useStatusColors } from './task-issue-row';
import { TaskPickerMenu } from './task-picker-menu';

type TranslationKey = Parameters<ReturnType<typeof useTranslations>>[0];

const RELATION_LABEL_KEYS: Record<ERelatedIssuesRelation, TranslationKey> = {
	[ERelatedIssuesRelation.BLOCKS]: 'common.BLOCKS',
	[ERelatedIssuesRelation.IS_BLOCKED_BY]: 'common.IS_BLOCKED_BY',
	[ERelatedIssuesRelation.CLONES]: 'common.CLONES',
	[ERelatedIssuesRelation.IS_CLONED_BY]: 'common.IS_CLONED_BY',
	[ERelatedIssuesRelation.DUPLICATES]: 'common.DUPLICATES',
	[ERelatedIssuesRelation.IS_DUPLICATED_BY]: 'common.IS_DUPLICATED_BY',
	[ERelatedIssuesRelation.RELATES_TO]: 'common.RELATES_TO'
};

/** Blocking first, then plain relations, then copies: the order a reader acts on them. */
const RELATION_ORDER: ERelatedIssuesRelation[] = [
	ERelatedIssuesRelation.IS_BLOCKED_BY,
	ERelatedIssuesRelation.BLOCKS,
	ERelatedIssuesRelation.RELATES_TO,
	ERelatedIssuesRelation.DUPLICATES,
	ERelatedIssuesRelation.IS_DUPLICATED_BY,
	ERelatedIssuesRelation.CLONES,
	ERelatedIssuesRelation.IS_CLONED_BY
];

interface RelationGroup {
	kind: ERelatedIssuesRelation;
	links: ITaskLinkedIssue[];
}

function linkedTaskOf(link: ITaskLinkedIssue) {
	return link.taskFrom ?? null;
}

function kindOf(link: ITaskLinkedIssue) {
	return link.action ?? ERelatedIssuesRelation.RELATES_TO;
}

function relationGroupsOf(task: TTask): RelationGroup[] {
	const links = ((task.linkedIssues ?? []) as ITaskLinkedIssue[]).filter((link) => Boolean(linkedTaskOf(link)));
	const groups: RelationGroup[] = [];
	for (const kind of RELATION_ORDER) {
		const kindLinks = links.filter((link) => kindOf(link) === kind);
		if (kindLinks.length > 0) {
			groups.push({ kind, links: kindLinks });
		}
	}
	return groups;
}

function relationOption(kind: ERelatedIssuesRelation, label: string): TaskPropertyMenuOption<ERelatedIssuesRelation> {
	return { key: String(kind), value: kind, label };
}

function linkCountOf(groups: RelationGroup[]) {
	let count = 0;
	for (const group of groups) {
		count += group.links.length;
	}
	return count;
}

function RelationKindMenu({
	link,
	onChange
}: Readonly<{ link: ITaskLinkedIssue; onChange: (link: ITaskLinkedIssue, kind: ERelatedIssuesRelation) => void }>) {
	const t = useTranslations();
	const options = useMemo<TaskPropertyMenuOption<ERelatedIssuesRelation>[]>(
		() => RELATION_ORDER.map((kind) => relationOption(kind, t(RELATION_LABEL_KEYS[kind]))),
		[t]
	);
	const current = kindOf(link);
	return (
		<TaskPropertyMenu
			options={options}
			isSelected={(kind) => kind === current}
			onSelect={(kind) => onChange(link, kind)}
			searchPlaceholder={t('taskDetail.relations.SEARCH_KIND')}
			triggerLabel={t('taskDetail.relations.CHANGE_KIND')}
			triggerClassName={cn(DETAIL_ROW_ACTION, 'rounded-md')}
			align="end"
			popupClassName="w-52"
		>
			<span className={cn(DETAIL_ICON_ACTION, 'size-6')}>
				<ChevronsUpDown aria-hidden="true" className="size-3.5" />
			</span>
		</TaskPropertyMenu>
	);
}

function RemoveLinkButton({
	link,
	onRemove
}: Readonly<{ link: ITaskLinkedIssue; onRemove: (link: ITaskLinkedIssue) => void }>) {
	const t = useTranslations();
	const label = t('taskDetail.relations.REMOVE');
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						aria-label={label}
						onClick={() => onRemove(link)}
						className={cn(DETAIL_ICON_ACTION, DETAIL_ROW_ACTION, 'size-6')}
					>
						<X aria-hidden="true" className="size-3.5" />
					</button>
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

export function TaskDetailRelations({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const teamTasks = useAtomValue(tasksByTeamState);
	const liveTaskId = useLiveTaskId();
	const statusColors = useStatusColors();
	const { data: user } = useUserQuery();
	const { link, createAndLink, changeKind, unlink } = useTaskRelations(task);
	const candidates = useMemo(() => relationCandidatesOf(task, teamTasks), [task, teamTasks]);
	const groups = useMemo(() => relationGroupsOf(task), [task]);
	const count = linkCountOf(groups);
	const hasLinks = count > 0;
	const addLabel = t('taskDrawer.ADD_RELATED_ISSUE');
	const canCreate = Boolean(user?.isEmailVerified);
	let onCreate: ((title: string) => void) | undefined;
	if (canCreate) {
		onCreate = (title) => void createAndLink(title);
	}

	const picker = (trigger: ReactNode, triggerClassName: string) => (
		<TaskPickerMenu
			tasks={candidates}
			onPick={(other) => void link(other)}
			searchPlaceholder={t('taskDetail.relations.SEARCH')}
			triggerLabel={addLabel}
			triggerClassName={triggerClassName}
			onCreate={onCreate}
			createLabel={(title) => t('taskDetail.picker.CREATE', { title })}
			align="end"
		>
			{trigger}
		</TaskPickerMenu>
	);

	const headerAction =
		hasLinks &&
		picker(
			<span className={DETAIL_GHOST_ACTION}>
				<Plus aria-hidden="true" />
				{t('taskDrawer.ADD')}
			</span>,
			'rounded-md'
		);

	return (
		<TaskDetailSection title={t('common.RELATED_ISSUES')} meta={hasLinks && count} actions={headerAction}>
			{hasLinks && (
				<div className="flex flex-col gap-3">
					{groups.map((group) => (
						<div key={group.kind} className="flex flex-col gap-1.5">
							<h3 className="text-xs font-medium text-muted-foreground">
								{t(RELATION_LABEL_KEYS[group.kind])}
							</h3>
							<ul className={DETAIL_LIST_SURFACE}>
								{group.links.map((relation) => {
									const linkedTask = linkedTaskOf(relation) as TTask;
									return (
										<TaskIssueRow
											key={relation.id ?? linkedTask.id}
											task={linkedTask}
											statusColor={statusColors.get(linkedTask.taskStatusId ?? '')}
											isLive={linkedTask.id === liveTaskId}
											trailing={
												<span className="flex shrink-0 items-center">
													<RelationKindMenu
														link={relation}
														onChange={(changed, kind) => void changeKind(changed, kind)}
													/>
													<RemoveLinkButton
														link={relation}
														onRemove={(removed) => void unlink(removed)}
													/>
												</span>
											}
										/>
									);
								})}
							</ul>
						</div>
					))}
				</div>
			)}
			{!hasLinks &&
				picker(
					<span className={DETAIL_ADD_ROW}>
						<Plus aria-hidden="true" />
						{addLabel}
					</span>,
					'block w-full rounded-xl'
				)}
		</TaskDetailSection>
	);
}
