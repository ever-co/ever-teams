'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { Button, buttonVariants } from '@/core/components/duplicated-components/_button';
import { Archive, ChevronLeft, ChevronRight, Pencil } from '@/core/components/icons';
import { FavoriteStarButton } from '@/core/components/favorites/favorite-parts';
import { ProjectActionsMenu } from '@/core/components/projects/project-actions-menu';
import { ProjectStatusChip, ProjectTile } from '@/core/components/projects/project-cells';
import { AvatarStack } from '@/core/components/teams/people-avatars';
import { useProjectActionModal } from '@/core/hooks/use-project-action-modal';
import { useProjectPermissions } from '@/core/hooks/projects/use-project-permissions';
import { cn } from '@/core/lib/helpers';
import { isDocsEnabled } from '@/core/lib/utils/docs-enabled';
import { isTaskTrashEnabled } from '@/core/lib/utils/comments-trash-flags';
import { clientNameOf, personFromProjectMember } from '@/core/lib/utils/project-list';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { TOrganizationProject } from '@/core/types/schemas';
import type { TTaskStatus } from '@/core/types/schemas/task/task-status.schema';

export type ProjectDetailTab = 'overview' | 'tasks' | 'people' | 'docs' | 'trash';

export interface ProjectNeighbours {
	position: number;
	total: number;
	previousId: string | null;
	nextId: string | null;
}

const PAGER_STEP = cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-muted-foreground');

const PAGER_STEP_DISABLED = 'pointer-events-none opacity-40';

function PagerStep({
	targetId,
	label,
	children
}: Readonly<{ targetId: string | null; label: string; children: React.ReactNode }>) {
	if (!targetId) {
		return (
			<span aria-hidden="true" className={cn(PAGER_STEP, PAGER_STEP_DISABLED)}>
				{children}
			</span>
		);
	}
	return (
		<Link href={`/projects/${targetId}`} aria-label={label} title={label} className={PAGER_STEP}>
			{children}
		</Link>
	);
}

function ProjectPager({ neighbours }: Readonly<{ neighbours: ProjectNeighbours }>) {
	const t = useTranslations();
	const hasSiblings = neighbours.total > 1;
	if (!hasSiblings) {
		return null;
	}
	return (
		<div className="flex items-center gap-0.5">
			<span className="pr-1 text-xs tabular-nums text-muted-foreground">
				{neighbours.position} / {neighbours.total}
			</span>
			<PagerStep targetId={neighbours.previousId} label={t('pages.projects.detail.PREVIOUS_PROJECT')}>
				<ChevronLeft />
			</PagerStep>
			<PagerStep targetId={neighbours.nextId} label={t('pages.projects.detail.NEXT_PROJECT')}>
				<ChevronRight />
			</PagerStep>
		</div>
	);
}

export function ProjectDetailHeader({
	project,
	statuses,
	neighbours,
	tab,
	onTabChange,
	taskCount
}: Readonly<{
	project: TOrganizationProject;
	statuses: TTaskStatus[];
	neighbours: ProjectNeighbours;
	tab: ProjectDetailTab;
	onTabChange: (tab: ProjectDetailTab) => void;
	taskCount: number | undefined;
}>) {
	const t = useTranslations();
	const { openEditModal } = useProjectActionModal();
	const { canEdit } = useProjectPermissions({ members: project.members });
	const people = (project.members ?? []).map(personFromProjectMember);
	const client = clientNameOf(project);
	const isArchived = Boolean(project.isArchived);
	const showsEdit = canEdit && !isArchived;
	const eyebrowParts = [project.code, client].filter(Boolean);
	const hasEyebrow = eyebrowParts.length > 0;

	const tabs: SegmentedControlItem<ProjectDetailTab>[] = [
		{ value: 'overview', label: t('pages.projects.detail.TAB_OVERVIEW') },
		{ value: 'tasks', label: t('common.TASKS'), count: taskCount },
		{ value: 'people', label: t('common.PEOPLE'), count: people.length },
		...(isDocsEnabled() ? [{ value: 'docs' as const, label: t('docs.TITLE') }] : []),
		...(isTaskTrashEnabled() ? [{ value: 'trash' as const, label: t('taskTrash.TAB') }] : [])
	];

	return (
		<div className="px-4">
			<div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
				<div className="flex min-w-0 items-center gap-3">
					<ProjectTile project={project} size="xl" />
					<div className="flex min-w-0 flex-col">
						{hasEyebrow && (
							<span className="truncate text-xs text-muted-foreground">{eyebrowParts.join(' · ')}</span>
						)}
						<div className="flex min-w-0 items-center gap-2">
							<h1 className="truncate text-lg font-semibold text-foreground">{project.name}</h1>
							<ProjectStatusChip
								statusName={project.status}
								statuses={statuses}
								className="max-sm:hidden"
							/>
							{isArchived && (
								<span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md bg-foreground/5 px-2 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
									<Archive />
									{t('pages.projects.list.SCOPE_ARCHIVED')}
								</span>
							)}
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<ProjectPager neighbours={neighbours} />
					{people.length > 0 && (
						<>
							<span className="h-4 w-px bg-border max-sm:hidden" />
							<span className="max-sm:hidden">
								<AvatarStack people={people} max={4} size="md" />
							</span>
						</>
					)}
					<FavoriteStarButton
						entity={EBaseEntityEnum.OrganizationProject}
						id={project.id}
						canAdd={!isArchived}
					/>
					{showsEdit && (
						<Button variant="outline" size="default" onClick={() => openEditModal(project.id)}>
							<Pencil />
							<span>{t('common.EDIT')}</span>
						</Button>
					)}
					<ProjectActionsMenu project={project} showsFavorite={false} />
				</div>
			</div>
			<div className="pb-3">
				<SegmentedControl<ProjectDetailTab>
					items={tabs}
					value={tab}
					onValueChange={onTabChange}
					ariaLabel={t('pages.projects.detail.SECTIONS')}
				/>
			</div>
		</div>
	);
}
