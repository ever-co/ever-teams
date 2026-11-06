'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import moment from 'moment';
import { toast } from 'sonner';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { Archive, ChevronDown, Link, RotateLeft } from '@/core/components/icons';
import { ProjectConfirmDialog, ProjectSummaryCard } from '@/core/components/projects/dialogs/project-confirm-dialog';
import { TaskPropertyIcon } from '@/core/components/tasks/task-property-icon';
import { useUpdateTask } from '@/core/hooks';
import { useEditOrganizationProject } from '@/core/hooks/organizations/projects/use-edit-organization-project';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import type { TTask } from '@/core/types/schemas/task/task.schema';

interface IArchiveProjectModalProps {
	open: boolean;
	closeModal: () => void;
	projectId: string;
}

function AffectedTasks({ tasks }: Readonly<{ tasks: TTask[] }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	return (
		<div className="flex flex-col">
			<button
				type="button"
				onClick={() => setIsOpen((open) => !open)}
				aria-expanded={isOpen}
				className="-mx-1.5 inline-flex h-7 w-fit items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<ChevronDown
					aria-hidden="true"
					className={cn('size-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
				/>
				{t('pages.projects.modals.archive.showTasks', { count: tasks.length })}
			</button>
			<AnimatedHeight swapKey={String(isOpen)}>
				{isOpen && (
					<ul className="mt-1 flex max-h-56 flex-col overflow-y-auto overscroll-contain rounded-xl hairline-ring ring-border hairline-divide-y divide-border">
						{tasks.map((task) => (
							<li key={task.id} className="flex h-9 items-center gap-2 px-3">
								<TaskPropertyIcon kind="issueType" name={task.issueType} className="size-3.5" />
								<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
									#{task.number}
								</span>
								<span className="min-w-0 truncate text-[13px] text-foreground">{task.title}</span>
							</li>
						))}
					</ul>
				)}
			</AnimatedHeight>
		</div>
	);
}

/** Archiving keeps the project and everything in it; its tasks are unlinked afterwards, as before. */
export function ArchiveProjectModal({ open, closeModal, projectId }: Readonly<IArchiveProjectModalProps>) {
	const t = useTranslations();
	const { organizationProjects } = useOrganizationProjectsQuery();
	const { editOrganizationProject, editOrganizationProjectLoading } = useEditOrganizationProject();
	const { updateTask } = useUpdateTask();
	const project = useMemo(
		() => organizationProjects.find((item) => item.id === projectId),
		[organizationProjects, projectId]
	);
	const affectedTasks = useMemo<TTask[]>(() => project?.tasks ?? [], [project]);
	const hasAffectedTasks = affectedTasks.length > 0;
	const projectName = project?.name ?? '';

	const unlinkAffectedTasks = useCallback(async () => {
		try {
			await Promise.all(affectedTasks.map((task) => updateTask({ ...task, projectId: undefined })));
		} catch (err) {
			console.error('Failed to unlink tasks from project', err);
			const reasonKey = errorReasonKeyOf(err) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.projects.TASKS_STILL_LINKED'), { description: t(reasonKey) });
		}
	}, [affectedTasks, t, updateTask]);

	const showArchived = useCallback(() => {
		if (projectName) {
			toast.success(t('toasts.projects.ARCHIVED', { name: projectName }), { duration: 4000 });
			return;
		}
		toast.success(t('toasts.projects.ARCHIVED_UNNAMED'), { duration: 4000 });
	}, [projectName, t]);

	const handleArchive = useCallback(async () => {
		try {
			// useEditOrganizationProject swallows the error: the global mutation fallback reports a failed archive
			const res = await editOrganizationProject(projectId, {
				isArchived: true,
				isActive: false,
				archivedAt: moment(Date.now()).format()
			});
			if (!res) {
				return;
			}
			closeModal();
			if (hasAffectedTasks) {
				void unlinkAffectedTasks();
			}
			showArchived();
		} catch (err) {
			console.error('Failed to archive project', err);
			const reasonKey = errorReasonKeyOf(err) as DottedLanguageObjectStringPaths;
			toast.error(t('toasts.projects.ARCHIVE_FAILED'), { description: t(reasonKey) });
		}
	}, [closeModal, editOrganizationProject, hasAffectedTasks, projectId, showArchived, t, unlinkAffectedTasks]);

	const consequences = [
		{ key: 'moves', icon: <Archive />, text: t('pages.projects.modals.archive.moves') },
		{ key: 'restore', icon: <RotateLeft />, text: t('pages.projects.modals.archive.restorable') }
	];
	if (hasAffectedTasks) {
		consequences.splice(1, 0, {
			key: 'tasks',
			icon: <Link />,
			text: t('pages.projects.modals.archive.unlinksTasks', { count: affectedTasks.length })
		});
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={closeModal}
			icon={<Archive />}
			title={t('pages.projects.archiveModal.title', { projectName })}
			subject={project && <ProjectSummaryCard project={project} />}
			consequences={consequences}
			extra={hasAffectedTasks && <AffectedTasks tasks={affectedTasks} />}
			confirmLabel={t('pages.projects.modals.archive.confirm')}
			isPending={editOrganizationProjectLoading}
			onConfirm={handleArchive}
		/>
	);
}
