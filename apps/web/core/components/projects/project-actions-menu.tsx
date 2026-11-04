'use client';

import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { Archive, Eye, MoreHorizontal, Pencil, RotateLeft, Trash } from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import {
	MENU_ANCHOR,
	MENU_ANCHORED_PANEL,
	MENU_ROW,
	MENU_ROW_DESTRUCTIVE,
	MENU_SEPARATOR,
	MENU_SURFACE
} from '@/core/components/common/menu-recipes';
import { useProjectActionModal } from '@/core/hooks/use-project-action-modal';
import { useProjectPermissions } from '@/core/hooks/projects/use-project-permissions';
import { cn } from '@/core/lib/helpers';
import type { TOrganizationProject } from '@/core/types/schemas';

interface ProjectActionsMenuProps {
	project: Pick<TOrganizationProject, 'id' | 'members' | 'isArchived'>;
	showsViewInfo?: boolean;
	/** The archived list let everyone restore, as the previous page did; the detail page keeps it to managers. */
	restoreForEveryone?: boolean;
	triggerClassName?: string;
}

export function ProjectActionsMenu({
	project,
	showsViewInfo = false,
	restoreForEveryone = false,
	triggerClassName
}: Readonly<ProjectActionsMenuProps>) {
	const t = useTranslations();
	const { openEditModal, openArchiveModal, openDeleteModal, openRestoreModal, openViewInfoModal } =
		useProjectActionModal();
	const { canEdit, canArchive, canDelete } = useProjectPermissions({ members: project.members });

	const isArchived = Boolean(project.isArchived);
	const canManage = canEdit || canArchive;
	const isRestoreAllowed = restoreForEveryone || canManage;
	const showsRestore = isArchived && isRestoreAllowed;
	const showsEdit = canEdit && !isArchived;
	const showsArchive = canArchive && !isArchived;
	const hasManageRows = showsRestore || showsEdit || showsArchive;
	const showsManageSeparator = showsViewInfo && hasManageRows;
	const hasRowsBeforeDelete = showsViewInfo || hasManageRows;
	const showsDeleteSeparator = canDelete && hasRowsBeforeDelete;
	const hasAnyRow = hasRowsBeforeDelete || canDelete;

	if (!hasAnyRow) {
		return null;
	}

	return (
		<Menu as="div" className="relative inline-flex shrink-0">
			<MenuButton
				aria-label={t('common.MORE_OPTIONS')}
				onClick={(event) => event.stopPropagation()}
				className={cn(
					buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
					'text-muted-foreground',
					triggerClassName
				)}
			>
				<MoreHorizontal />
			</MenuButton>
			<MenuItems anchor={MENU_ANCHOR} transition className={cn(MENU_SURFACE, MENU_ANCHORED_PANEL)}>
				{showsViewInfo && (
					<MenuItem>
						<button type="button" onClick={() => openViewInfoModal(project.id)} className={MENU_ROW}>
							<Eye />
							<span>{t('common.VIEW_INFO')}</span>
						</button>
					</MenuItem>
				)}
				{showsManageSeparator && <MenuSeparator className={MENU_SEPARATOR} />}
				{showsRestore && (
					<MenuItem>
						<button type="button" onClick={() => openRestoreModal(project.id)} className={MENU_ROW}>
							<RotateLeft />
							<span>{t('common.RESTORE')}</span>
						</button>
					</MenuItem>
				)}
				{showsEdit && (
					<MenuItem>
						<button type="button" onClick={() => openEditModal(project.id)} className={MENU_ROW}>
							<Pencil />
							<span>{t('common.EDIT')}</span>
						</button>
					</MenuItem>
				)}
				{showsArchive && (
					<MenuItem>
						<button type="button" onClick={() => openArchiveModal(project.id)} className={MENU_ROW}>
							<Archive />
							<span>{t('common.ARCHIVE')}</span>
						</button>
					</MenuItem>
				)}
				{showsDeleteSeparator && <MenuSeparator className={MENU_SEPARATOR} />}
				{canDelete && (
					<MenuItem>
						<button
							type="button"
							onClick={() => openDeleteModal(project.id)}
							className={cn(MENU_ROW, MENU_ROW_DESTRUCTIVE)}
						>
							<Trash />
							<span>{t('common.DELETE')}</span>
						</button>
					</MenuItem>
				)}
			</MenuItems>
		</Menu>
	);
}
