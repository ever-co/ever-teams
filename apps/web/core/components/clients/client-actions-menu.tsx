'use client';

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { Archive, MoreHorizontal, Pencil, RotateLeft } from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { MENU_ANCHOR, MENU_ANCHORED_PANEL, MENU_ROW, MENU_SURFACE } from '@/core/components/common/menu-recipes';
import { cn } from '@/core/lib/helpers';
import { isArchivedClient, type ClientAccess } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

interface ClientActionsMenuProps {
	client: TClient;
	access: ClientAccess;
	onEdit: (client: TClient) => void;
	onArchive: (client: TClient) => void;
	onRestore: (client: TClient) => void;
}

/** The actions the viewer may take on one client; nothing is rendered when there is none. */
export function ClientActionsMenu({ client, access, onEdit, onArchive, onRestore }: Readonly<ClientActionsMenuProps>) {
	const t = useTranslations();
	const isArchived = isArchivedClient(client);
	const showsEdit = access.canEdit && !isArchived;
	const showsArchive = access.canArchive && !isArchived;
	const showsRestore = access.canArchive && isArchived;
	const hasAnyRow = showsEdit || showsArchive || showsRestore;
	if (!hasAnyRow) {
		return null;
	}
	return (
		<Menu as="div" className="relative inline-flex shrink-0">
			<MenuButton
				aria-label={t('clients.ACTIONS_FOR', { name: client.name })}
				className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }), 'text-muted-foreground')}
			>
				<MoreHorizontal />
			</MenuButton>
			<MenuItems anchor={MENU_ANCHOR} transition className={cn(MENU_SURFACE, MENU_ANCHORED_PANEL)}>
				{showsEdit && (
					<MenuItem>
						<button type="button" onClick={() => onEdit(client)} className={MENU_ROW}>
							<Pencil />
							<span>{t('common.EDIT')}</span>
						</button>
					</MenuItem>
				)}
				{showsArchive && (
					<MenuItem>
						<button type="button" onClick={() => onArchive(client)} className={MENU_ROW}>
							<Archive />
							<span>{t('common.ARCHIVE')}</span>
						</button>
					</MenuItem>
				)}
				{showsRestore && (
					<MenuItem>
						<button type="button" onClick={() => onRestore(client)} className={MENU_ROW}>
							<RotateLeft />
							<span>{t('common.RESTORE')}</span>
						</button>
					</MenuItem>
				)}
			</MenuItems>
		</Menu>
	);
}
