'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { RichTextView } from '@/core/components/common/rich-editor/rich-text-view';
import { SheetTitle } from '@/core/components/common/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Button } from '@/core/components/duplicated-components/_button';
import { Archive, ArrowUpRight, Pencil, X } from '@/core/components/icons';
import {
	MUTED_VALUE,
	ProjectStatusChip,
	ProjectTile,
	formatProjectDay
} from '@/core/components/projects/project-cells';
import {
	PROJECT_SECTION_LABEL,
	ProjectFacts,
	ProjectLinks,
	ProjectProperties
} from '@/core/components/projects/project-properties';
import { useProjectPermissions } from '@/core/hooks/projects/use-project-permissions';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { useProjectActionModal } from '@/core/hooks/use-project-action-modal';
import { realDateOf } from '@/core/lib/utils/project-list';
import type { TOrganizationProject } from '@/core/types/schemas';

function ArchivedChip({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const locale = useLocale();
	const archivedAt = realDateOf(project.archivedAt);
	let label = t('pages.projects.list.SCOPE_ARCHIVED');
	if (archivedAt) {
		label = t('pages.projects.list.ARCHIVED_ON', { date: formatProjectDay(archivedAt, locale) });
	}
	return (
		<span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-foreground/[0.05] px-2 text-xs font-medium text-muted-foreground [&_svg]:size-3.5">
			<Archive aria-hidden="true" />
			{label}
		</span>
	);
}

function ProjectDescriptionBlock({ description }: Readonly<{ description: string | null | undefined }>) {
	const t = useTranslations();
	const hasDescription = Boolean(description?.trim());
	return (
		<section className="flex flex-col gap-2">
			<h2 className={PROJECT_SECTION_LABEL}>{t('common.DESCRIPTION')}</h2>
			{hasDescription && (
				<RichTextView
					value={description ?? ''}
					className="rounded-xl bg-foreground/[0.03] px-3.5 py-3 text-[13px] leading-relaxed text-foreground"
				/>
			)}
			{!hasDescription && <p className={MUTED_VALUE}>{t('pages.projects.modals.info.noDescription')}</p>}
		</section>
	);
}

interface ProjectInfoSheetProps {
	project: TOrganizationProject;
	onClose: () => void;
}

export function ProjectInfoSheet({ project, onClose }: Readonly<ProjectInfoSheetProps>) {
	const t = useTranslations();
	const { taskStatuses } = useTaskStatusesQuery();
	const { canEdit } = useProjectPermissions({ members: project.members });
	const { openEditModal } = useProjectActionModal();
	const isArchived = Boolean(project.isArchived);
	const canEditProject = canEdit && !isArchived;
	const editLabel = t('common.EDIT');

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex h-12 shrink-0 items-center gap-1.5 hairline-b border-border pr-2 pl-4">
				<span className="text-[13px] text-muted-foreground">{t('pages.projects.modals.info.title')}</span>
				<span className="ml-auto flex items-center gap-1">
					{canEditProject && (
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										onClick={() => openEditModal(project.id)}
										aria-label={editLabel}
										className="text-muted-foreground"
									/>
								}
							>
								<Pencil />
							</TooltipTrigger>
							<TooltipContent>{editLabel}</TooltipContent>
						</Tooltip>
					)}
					<Button variant="outline" size="sm" asChild>
						<Link href={`/projects/${project.id}`} onClick={onClose}>
							{t('pages.projects.modals.openProject')}
							<ArrowUpRight aria-hidden="true" />
						</Link>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onClose}
						aria-label={t('common.CLOSE')}
						className="text-muted-foreground"
					>
						<X />
					</Button>
				</span>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
				<div className="flex items-center gap-3.5 hairline-b border-dashed border-border bg-foreground/[0.02] px-5 py-5">
					<ProjectTile project={project} size="xl" className="size-11 rounded-[12px]" />
					<div className="flex min-w-0 flex-1 flex-col gap-1.5">
						<SheetTitle className="truncate text-lg font-semibold text-foreground">
							{project.name}
						</SheetTitle>
						<div className="flex flex-wrap items-center gap-1.5">
							{project.code && (
								<span className="inline-flex h-6 items-center rounded-md bg-foreground/[0.05] px-1.5 font-mono text-[11px] text-muted-foreground">
									{project.code}
								</span>
							)}
							<ProjectStatusChip statusName={project.status} statuses={taskStatuses} />
							{isArchived && <ArchivedChip project={project} />}
						</div>
					</div>
				</div>

				<div className="flex flex-col gap-7 px-5 py-5">
					<ProjectProperties project={project} statuses={taskStatuses} />
					<ProjectLinks project={project} />
					<ProjectDescriptionBlock description={project.description} />
					<div className="rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
						<ProjectFacts project={project} />
					</div>
				</div>
			</div>
		</div>
	);
}
