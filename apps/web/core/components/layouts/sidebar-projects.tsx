'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { commandKeycapClass } from '@/core/components/common/command';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Archive, InformationCircle, Link, MoreHorizontal, Pencil, Plus, Star } from '@/core/components/icons';
import { useFavoriteToggle } from '@/core/hooks/favorites/use-favorite-toggle';
import { useProjectPermissions } from '@/core/hooks/projects/use-project-permissions';
import { useProjectActionModal } from '@/core/hooks/use-project-action-modal';
import { cn } from '@/core/lib/helpers';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
import type { TOrganizationProject } from '@/core/types/schemas';

const ROW_ACTION_BUTTON =
	'flex size-5 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 data-popup-open:bg-foreground/[0.06] data-popup-open:text-foreground [&_svg]:size-4';

export function SidebarProjectTile({ project }: Readonly<{ project: TOrganizationProject }>) {
	return (
		<EntityTile
			name={project.name}
			color={project.color}
			imageUrl={project.imageUrl}
			className="size-4 rounded-[5px] text-[7px]"
		/>
	);
}

/** The project the running timer is tracking, with the task rows' live dot. */
export function SidebarTrackingMark({ label }: Readonly<{ label: string }>) {
	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			className="size-1.5 rounded-full bg-success ring-2 ring-success/20"
		/>
	);
}

export function SidebarCount({ value }: Readonly<{ value: number }>) {
	return <span className={cn(commandKeycapClass, 'h-4.5 min-w-4.5 px-1 text-[10px] tabular-nums')}>{value}</span>;
}

/** Details, edit, copy link and archive for one project row, opening the app's global project dialogs. */
export function SidebarProjectMenu({ project }: Readonly<{ project: TOrganizationProject }>) {
	const t = useTranslations();
	const { openViewInfoModal, openEditModal, openArchiveModal } = useProjectActionModal();
	const { canEdit } = useProjectPermissions({ members: project.members });
	const isArchived = Boolean(project.isArchived);
	const canChange = canEdit && !isArchived;
	const projectName = project.name ?? '';
	const favorites = useFavoriteToggle(EBaseEntityEnum.OrganizationProject);
	const isFavorite = favorites.isFavorite(project.id);
	const toggleFavorite = () => {
		favorites.toggleFavorite(project.id).catch(() => toast.error(t('favorites.UPDATE_FAILED')));
	};

	const copyLink = useCallback(async () => {
		const url = `${window.location.origin}/projects/${project.id}`;
		try {
			await navigator.clipboard.writeText(url);
			toast.success(t('sidebar.projectMenu.LINK_COPIED', { name: projectName }));
		} catch {
			toast.error(t('sidebar.projectMenu.LINK_NOT_COPIED'));
		}
	}, [project.id, projectName, t]);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						aria-label={t('sidebar.projectMenu.ACTIONS', { name: projectName })}
						className={ROW_ACTION_BUTTON}
					/>
				}
			>
				<MoreHorizontal />
			</DropdownMenuTrigger>
			<DropdownMenuContent side="right" align="start" sideOffset={8} className="w-52">
				<DropdownMenuItem onClick={() => openViewInfoModal(project.id)}>
					<InformationCircle />
					{t('sidebar.projectMenu.DETAILS')}
				</DropdownMenuItem>
				{canChange && (
					<DropdownMenuItem onClick={() => openEditModal(project.id)}>
						<Pencil />
						{t('sidebar.projectMenu.EDIT')}
					</DropdownMenuItem>
				)}
				<DropdownMenuItem onClick={() => void copyLink()}>
					<Link />
					{t('sidebar.projectMenu.COPY_LINK')}
				</DropdownMenuItem>
				<DropdownMenuItem disabled={favorites.isPending(project.id)} onClick={toggleFavorite}>
					<Star className={cn(isFavorite && 'fill-current text-amber-500')} />
					{isFavorite ? t('favorites.REMOVE') : t('favorites.ADD')}
				</DropdownMenuItem>
				{canChange && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={() => openArchiveModal(project.id)}>
							<Archive />
							{t('sidebar.projectMenu.ARCHIVE')}
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/** A team without projects still offers to create one, as a dashed add row (dashed means "not there yet"). */
export function SidebarCreateProjectRow({ onCreate }: Readonly<{ onCreate: () => void }>) {
	const t = useTranslations();
	return (
		<button
			type="button"
			onClick={onCreate}
			className="flex h-7 w-full items-center gap-2 rounded-md hairline-border border-dashed border-foreground/20 px-2 text-[13px] text-muted-foreground outline-none transition-colors hover:border-foreground/35 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3.5"
		>
			<Plus aria-hidden="true" />
			{t('sidebar.CREATE_PROJECT')}
		</button>
	);
}
