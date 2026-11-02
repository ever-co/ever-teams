import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Archive, Eye, MoreHorizontal, Pencil, Trash } from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { cn } from '@/core/lib/helpers';
import { dataColorChipStyle, dataColorDotStyle } from '@/core/components/tasks/task-data-color';
import { TOrganizationProject } from '@/core/types/schemas';
import { useProjectActionModal } from '@/core/hooks/use-project-action-modal';
import { useProjectPermissions } from '@/core/hooks/projects/use-project-permissions';
import {
	MENU_ANCHOR,
	MENU_ANCHORED_PANEL,
	MENU_ROW,
	MENU_ROW_DESTRUCTIVE,
	MENU_SEPARATOR,
	MENU_SURFACE
} from '@/core/components/common/menu-recipes';

export type ProjectViewDataType = {
	project: {
		id: string;
		name: TOrganizationProject['name'];
		imageUrl: TOrganizationProject['imageUrl'];
		color: TOrganizationProject['color'];
	};
	status: TOrganizationProject['status'];
	archivedAt: TOrganizationProject['archivedAt'];
	isArchived: TOrganizationProject['isArchived'];
	startDate: TOrganizationProject['startDate'];
	endDate: TOrganizationProject['endDate'];
	createdAt: TOrganizationProject['createdAt'];
	members: TOrganizationProject['members'];
	managers: TOrganizationProject['members'];
	teams: TOrganizationProject['teams'];
};

const DARK_THEME_STATUS_COLOR = 'hsl(var(--muted-foreground))';

export function projectStatusColor(resolvedTheme: string | undefined, statusColor: string | null | undefined) {
	if (resolvedTheme === 'light') {
		return statusColor ?? 'transparent';
	}
	return DARK_THEME_STATUS_COLOR;
}

export function ProjectStatusChip({
	color,
	children,
	className
}: Readonly<{ color: string; children: ReactNode; className?: string }>) {
	return (
		<span
			style={dataColorChipStyle(color)}
			className={cn(
				'chip-3d inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium',
				className
			)}
		>
			<span style={dataColorDotStyle(color)} className="size-1.5 shrink-0 rounded-full" />
			{children}
		</span>
	);
}

export const MENU_POPUP_RECIPE =
	'rounded-xl bg-popover p-1 text-popover-foreground hairline-ring ring-border shadow-md shadow-black/6.5 focus:outline-none';

export const MENU_ITEM_RECIPE = 'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors';

/**
 * Project item actions menu (Edit, Archive, Delete)
 *
 * Uses the global modal pattern to avoid rendering N modals for N items,
 * which was causing "Maximum update depth exceeded" errors.
 *
 * Permissions:
 * - View Info: Available to all users
 * - Edit/Archive/Delete: Only for Admins or Project Managers
 *
 */
export function ProjectItemActions({ item }: { item: ProjectViewDataType }) {
	const { openEditModal, openArchiveModal, openDeleteModal, openViewInfoModal } = useProjectActionModal();
	const t = useTranslations();
	const { canEdit, canArchive, canDelete } = useProjectPermissions({ members: item.members });

	const showsManageGroup = canEdit || canArchive;

	return (
		<Menu as="div" className="inline-block relative text-left">
			<div>
				<MenuButton
					aria-label={t('common.MORE_OPTIONS')}
					className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-muted-foreground')}
				>
					<MoreHorizontal />
				</MenuButton>
			</div>
			<MenuItems anchor={MENU_ANCHOR} transition className={cn(MENU_SURFACE, MENU_ANCHORED_PANEL)}>
				{/* View Info - Available to all users */}
				<MenuItem>
					<button onClick={() => openViewInfoModal(item.project.id)} className={MENU_ROW}>
						<Eye />
						<span>{t('common.VIEW_INFO')}</span>
					</button>
				</MenuItem>

				{showsManageGroup && <MenuSeparator className={MENU_SEPARATOR} />}

				{/* Edit - Only for Admins or Project Managers */}
				{canEdit && (
					<MenuItem>
						<button onClick={() => openEditModal(item.project.id)} className={MENU_ROW}>
							<Pencil />
							<span>{t('common.EDIT')}</span>
						</button>
					</MenuItem>
				)}

				{/* Archive - Only for Admins or Project Managers */}
				{canArchive && (
					<MenuItem>
						<button onClick={() => openArchiveModal(item.project.id)} className={MENU_ROW}>
							<Archive />
							<span>{t('common.ARCHIVE')}</span>
						</button>
					</MenuItem>
				)}

				{canDelete && <MenuSeparator className={MENU_SEPARATOR} />}

				{/* Delete - Only for Admins or Project Managers */}
				{canDelete && (
					<MenuItem>
						<button
							onClick={() => openDeleteModal(item.project.id)}
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
