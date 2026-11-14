'use client';

import Link from 'next/link';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Archive, Invoice, Link as LinkGlyph, MoreHorizontal, Pencil, RotateLeft } from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import {
	MENU_ANCHOR,
	MENU_ANCHORED_PANEL,
	MENU_ROW,
	MENU_SEPARATOR,
	MENU_SURFACE
} from '@/core/components/common/menu-recipes';
import { newInvoicePathOf } from '@/core/components/pages/invoices/invoice-access-guard';
import { useInvoiceAccess } from '@/core/hooks/invoices/use-invoice-access';
import { cn } from '@/core/lib/helpers';
import { clientPagePathOf, isArchivedClient, type ClientAccess } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

export type ClientMenuRow = 'newInvoice' | 'edit' | 'copyLink' | 'archive';

const LIST_ROWS: ReadonlyArray<ClientMenuRow> = ['newInvoice', 'edit', 'archive'];

interface ClientActionsMenuProps {
	client: TClient;
	access: ClientAccess;
	onEdit: (client: TClient) => void;
	onArchive?: (client: TClient) => void;
	onRestore?: (client: TClient) => void;
	/** Read once by the page and given to every row; a menu left without it reads the invoice permissions itself. */
	canCreateInvoice?: boolean;
	rows?: ReadonlyArray<ClientMenuRow>;
	triggerClassName?: string;
}

type MenuBodyProps = Omit<ClientActionsMenuProps, 'canCreateInvoice'> & { canCreateInvoice: boolean };

/** The actions the viewer may take on one client; nothing is rendered when there is none. */
export function ClientActionsMenu({ canCreateInvoice, ...props }: Readonly<ClientActionsMenuProps>) {
	if (canCreateInvoice === undefined) {
		return <ClientActionsMenuReadingAccess {...props} />;
	}
	return <ClientActionsMenuBody {...props} canCreateInvoice={canCreateInvoice} />;
}

function ClientActionsMenuReadingAccess(props: Readonly<Omit<ClientActionsMenuProps, 'canCreateInvoice'>>) {
	const invoiceAccess = useInvoiceAccess();
	return <ClientActionsMenuBody {...props} canCreateInvoice={invoiceAccess.canCreate} />;
}

function ClientActionsMenuBody({
	client,
	access,
	onEdit,
	onArchive,
	onRestore,
	canCreateInvoice,
	rows = LIST_ROWS,
	triggerClassName
}: Readonly<MenuBodyProps>) {
	const t = useTranslations();
	const isArchived = isArchivedClient(client);
	const offersNewInvoice = rows.includes('newInvoice');
	const offersEdit = rows.includes('edit');
	const offersArchive = rows.includes('archive');
	const showsCopyLink = rows.includes('copyLink');
	const mayCreateInvoice = canCreateInvoice && !isArchived;
	const mayEdit = access.canEdit && !isArchived;
	const mayArchive = access.canArchive && !isArchived;
	const mayRestore = access.canArchive && isArchived;
	const showsNewInvoice = offersNewInvoice && mayCreateInvoice;
	const showsEdit = offersEdit && mayEdit;
	const showsArchive = offersArchive && mayArchive;
	const showsRestore = offersArchive && mayRestore;
	const hasWorkRows = showsNewInvoice || showsEdit;
	const hasStateRow = showsArchive || showsRestore;
	const hasAnyRow = [hasWorkRows, showsCopyLink, hasStateRow].some(Boolean);
	if (!hasAnyRow) {
		return null;
	}
	const separatesLink = hasWorkRows && showsCopyLink;
	const hasRowsAboveState = hasWorkRows || showsCopyLink;
	const separatesState = hasRowsAboveState && hasStateRow;

	const copyLink = async () => {
		const path = clientPagePathOf(client.id);
		const url = `${window.location.origin}${path}`;
		try {
			await navigator.clipboard.writeText(url);
			toast.success(t('clients.LINK_COPIED', { name: client.name }));
		} catch {
			toast.error(t('clients.LINK_NOT_COPIED'));
		}
	};

	return (
		<Menu as="div" className="relative inline-flex shrink-0">
			<MenuButton
				aria-label={t('clients.ACTIONS_FOR', { name: client.name })}
				className={cn(
					buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
					'text-muted-foreground',
					triggerClassName
				)}
			>
				<MoreHorizontal />
			</MenuButton>
			<MenuItems anchor={MENU_ANCHOR} transition className={cn(MENU_SURFACE, MENU_ANCHORED_PANEL)}>
				{showsNewInvoice && (
					<MenuItem>
						<Link href={newInvoicePathOf(client.id)} className={MENU_ROW}>
							<Invoice />
							<span>{t('invoices.NEW_INVOICE')}</span>
						</Link>
					</MenuItem>
				)}
				{showsEdit && (
					<MenuItem>
						<button type="button" onClick={() => onEdit(client)} className={MENU_ROW}>
							<Pencil />
							<span>{t('common.EDIT')}</span>
						</button>
					</MenuItem>
				)}
				{separatesLink && <div role="separator" className={MENU_SEPARATOR} />}
				{showsCopyLink && (
					<MenuItem>
						<button type="button" onClick={() => void copyLink()} className={MENU_ROW}>
							<LinkGlyph />
							<span>{t('common.COPY_LINK')}</span>
						</button>
					</MenuItem>
				)}
				{separatesState && <div role="separator" className={MENU_SEPARATOR} />}
				{showsArchive && (
					<MenuItem>
						<button type="button" onClick={() => onArchive?.(client)} className={MENU_ROW}>
							<Archive />
							<span>{t('common.ARCHIVE')}</span>
						</button>
					</MenuItem>
				)}
				{showsRestore && (
					<MenuItem>
						<button type="button" onClick={() => onRestore?.(client)} className={MENU_ROW}>
							<RotateLeft />
							<span>{t('common.RESTORE')}</span>
						</button>
					</MenuItem>
				)}
			</MenuItems>
		</Menu>
	);
}
