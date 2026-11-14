'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { EntityTile } from '@/core/components/common/entity-tile';
import { Archive, Building, Folder, Invoice, RotateLeft } from '@/core/components/icons';
import {
	ProjectConfirmDialog,
	type ProjectConsequence
} from '@/core/components/projects/dialogs/project-confirm-dialog';
import { useClientMutations } from '@/core/hooks/clients/use-client-mutations';
import type { TClient } from '@/core/types/schemas';

interface ClientConfirmDialogProps {
	open: boolean;
	/** Kept by the page while the dialog fades out, so its title never loses the client's name. */
	client: TClient | null;
	onClose: () => void;
	onOpenClient?: (client: TClient) => void;
}

/** A dialog left while its request runs would let the answer close whichever dialog is open by then. */
function leaveUnlessPending(isPending: boolean, close: () => void) {
	return () => {
		if (isPending) {
			return;
		}
		close();
	};
}

/** The toast's way back to the client, which may have left the list on screen. */
function openClientToast(client: TClient, label: string, onOpenClient: ((client: TClient) => void) | undefined) {
	if (!onOpenClient) {
		return undefined;
	}
	return { action: { label, onClick: () => onOpenClient(client) } };
}

function ClientSubject({ client }: Readonly<{ client: TClient | null }>) {
	const t = useTranslations();
	if (!client) {
		return null;
	}
	const email = client.primaryEmail;
	return (
		<div className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 hairline-ring ring-border shadow-sm shadow-black/6.5">
			<EntityTile name={client.name} imageUrl={client.imageUrl} className="size-8 rounded-[9px] text-[11px]" />
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="truncate text-[13px] font-medium text-foreground">{client.name}</span>
				{email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
				{!email && <span className="text-xs text-muted-foreground">{t('clients.contact.NO_EMAIL')}</span>}
			</span>
		</div>
	);
}

export function ArchiveClientDialog({ open, client, onClose, onOpenClient }: Readonly<ClientConfirmDialogProps>) {
	const t = useTranslations();
	const { archiveClient, isArchiving } = useClientMutations();
	const [hasFailed, setHasFailed] = useState(false);
	const name = client?.name ?? '';

	const close = () => {
		setHasFailed(false);
		onClose();
	};

	const confirm = async () => {
		if (!client) {
			return;
		}
		setHasFailed(false);
		try {
			await archiveClient(client.id);
			const toastOptions = openClientToast(client, t('clients.OPEN_CLIENT'), onOpenClient);
			toast.success(t('clients.toasts.ARCHIVED', { name }), toastOptions);
			close();
		} catch {
			setHasFailed(true);
		}
	};

	const consequences: ProjectConsequence[] = [
		{ key: 'projects', icon: <Folder />, text: t('clients.archive.KEEPS_PROJECTS') },
		{ key: 'invoices', icon: <Invoice />, text: t('clients.archive.KEEPS_INVOICES') },
		{ key: 'picker', icon: <Building />, text: t('clients.archive.LEAVES_PICKER') },
		{ key: 'restore', icon: <RotateLeft />, text: t('clients.archive.CAN_RESTORE') }
	];

	let error: string | null = null;
	if (hasFailed) {
		error = t('clients.archive.FAILED');
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={leaveUnlessPending(isArchiving, close)}
			icon={<Archive />}
			title={t('clients.archive.TITLE', { name })}
			subject={<ClientSubject client={client} />}
			consequences={consequences}
			confirmLabel={t('clients.archive.CONFIRM')}
			isPending={isArchiving}
			error={error}
			onConfirm={() => void confirm()}
		/>
	);
}

export function RestoreClientDialog({ open, client, onClose, onOpenClient }: Readonly<ClientConfirmDialogProps>) {
	const t = useTranslations();
	const { restoreClient, isRestoring } = useClientMutations();
	const [hasFailed, setHasFailed] = useState(false);
	const name = client?.name ?? '';

	const close = () => {
		setHasFailed(false);
		onClose();
	};

	const confirm = async () => {
		if (!client) {
			return;
		}
		setHasFailed(false);
		try {
			await restoreClient(client.id);
			const toastOptions = openClientToast(client, t('clients.OPEN_CLIENT'), onOpenClient);
			toast.success(t('clients.toasts.RESTORED', { name }), toastOptions);
			close();
		} catch {
			setHasFailed(true);
		}
	};

	const consequences: ProjectConsequence[] = [
		{ key: 'picker', icon: <Building />, text: t('clients.restore.BACK_IN_PICKER') },
		{ key: 'kept', icon: <Folder />, text: t('clients.restore.KEEPS_EVERYTHING') }
	];

	let error: string | null = null;
	if (hasFailed) {
		error = t('clients.restore.FAILED');
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={leaveUnlessPending(isRestoring, close)}
			icon={<RotateLeft />}
			title={t('clients.restore.TITLE', { name })}
			subject={<ClientSubject client={client} />}
			consequences={consequences}
			confirmLabel={t('clients.restore.CONFIRM')}
			isPending={isRestoring}
			error={error}
			onConfirm={() => void confirm()}
		/>
	);
}
