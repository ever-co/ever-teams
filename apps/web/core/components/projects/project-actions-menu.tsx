'use client';

import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Archive, Eye, MoreHorizontal, Pencil, RotateLeft, Star, Trash } from '@/core/components/icons';
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
import { useFavoriteToggle } from '@/core/hooks/favorites/use-favorite-toggle';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import { cn } from '@/core/lib/helpers';
import type { TOrganizationProject } from '@/core/types/schemas';

interface ProjectActionsMenuProps {
	project: Pick<TOrganizationProject, 'id' | 'members' | 'isArchived'>;
	showsViewInfo?: boolean;
	/** The archived list let everyone restore, as the previous page did; the detail page keeps it to managers. */
	restoreForEveryone?: boolean;
	/** Off where the page shows its own star (the project's header). */
	showsFavorite?: boolean;
	triggerClassName?: string;
}

export function ProjectActionsMenu({
	project,
	showsViewInfo = false,
	restoreForEveryone = false,
	showsFavorite = true,
	triggerClassName
}: Readonly<ProjectActionsMenuProps>) {
	const t = useTranslations();
	const { openEditModal, openArchiveModal, openDeleteModal, openRestoreModal, openViewInfoModal } =
		useProjectActionModal();
	const { canEdit, canArchive, canDelete } = useProjectPermissions({ members: project.members });
	const favorites = useFavoriteToggle(EBaseEntityEnum.OrganizationProject);
	const isFavorite = favorites.isFavorite(project.id);

	const isArchived = Boolean(project.isArchived);
	const canManage = canEdit || canArchive;
	const isRestoreAllowed = restoreForEveryone || canManage;
	const showsRestore = isArchived && isRestoreAllowed;
	const showsEdit = canEdit && !isArchived;
	const showsArchive = canArchive && !isArchived;
	const hasManageRows = showsRestore || showsEdit || showsArchive;
	// Anyone may star a project (#5017); an archived one only leaves the favourites
	const showsFavoriteRow = showsFavorite && (!isArchived || isFavorite);
	const showsFavoriteSeparator = showsFavoriteRow && (showsViewInfo || hasManageRows || canDelete);
	const showsManageSeparator = showsViewInfo && hasManageRows;
	const hasRowsBeforeDelete = showsViewInfo || hasManageRows;
	const showsDeleteSeparator = canDelete && hasRowsBeforeDelete;
	const hasAnyRow = showsFavoriteRow || hasRowsBeforeDelete || canDelete;

	const toggleFavorite = () => {
		favorites.toggleFavorite(project.id).catch(() => toast.error(t('favorites.UPDATE_FAILED')));
	};

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
				{showsFavoriteRow && (
					<MenuItem disabled={favorites.isPending(project.id)}>
						<button type="button" onClick={toggleFavorite} className={MENU_ROW}>
							<Star className={cn(isFavorite && 'fill-current text-amber-500')} />
							<span>{isFavorite ? t('favorites.REMOVE') : t('favorites.ADD')}</span>
						</button>
					</MenuItem>
				)}
				{showsFavoriteSeparator && <MenuSeparator className={MENU_SEPARATOR} />}
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
