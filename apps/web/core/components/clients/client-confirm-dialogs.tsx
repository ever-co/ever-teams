'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Archive, Building, Folder, RotateLeft } from '@/core/components/icons';
import {
	ProjectConfirmDialog,
	type ProjectConsequence
} from '@/core/components/projects/dialogs/project-confirm-dialog';
import { useClientMutations } from '@/core/hooks/clients/use-client-mutations';
import type { TClient } from '@/core/types/schemas';

interface ClientConfirmDialogProps {
	open: boolean;
	client: TClient | null;
	onClose: () => void;
}

export function ArchiveClientDialog({ open, client, onClose }: Readonly<ClientConfirmDialogProps>) {
	const t = useTranslations();
	const { archiveClient, isArchiving } = useClientMutations();
	const [hasFailed, setHasFailed] = useState(false);
	const name = client?.name ?? '';

	const close = () => {
		setHasFailed(false);
		onClose();
	};

	// The answer closes the dialog; until it comes the dialog stays, so it cannot close another client's dialog
	const dismiss = () => {
		if (isArchiving) {
			return;
		}
		close();
	};

	const confirm = async () => {
		if (!client) {
			return;
		}
		setHasFailed(false);
		try {
			await archiveClient(client.id);
			toast.success(t('clients.toasts.ARCHIVED', { name }));
			close();
		} catch {
			setHasFailed(true);
		}
	};

	const consequences: ProjectConsequence[] = [
		{ key: 'projects', icon: <Folder />, text: t('clients.archive.KEEPS_PROJECTS') },
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
			onClose={dismiss}
			icon={<Archive />}
			title={t('clients.archive.TITLE', { name })}
			consequences={consequences}
			confirmLabel={t('clients.archive.CONFIRM')}
			isPending={isArchiving}
			error={error}
			onConfirm={() => void confirm()}
		/>
	);
}

export function RestoreClientDialog({ open, client, onClose }: Readonly<ClientConfirmDialogProps>) {
	const t = useTranslations();
	const { restoreClient, isRestoring } = useClientMutations();
	const [hasFailed, setHasFailed] = useState(false);
	const name = client?.name ?? '';

	const close = () => {
		setHasFailed(false);
		onClose();
	};

	// The answer closes the dialog; until it comes the dialog stays, so it cannot close another client's dialog
	const dismiss = () => {
		if (isRestoring) {
			return;
		}
		close();
	};

	const confirm = async () => {
		if (!client) {
			return;
		}
		setHasFailed(false);
		try {
			await restoreClient(client.id);
			toast.success(t('clients.toasts.RESTORED', { name }));
			close();
		} catch {
			setHasFailed(true);
		}
	};

	const consequences: ProjectConsequence[] = [
		{ key: 'picker', icon: <Building />, text: t('clients.restore.BACK_IN_PICKER') }
	];

	let error: string | null = null;
	if (hasFailed) {
		error = t('clients.restore.FAILED');
	}

	return (
		<ProjectConfirmDialog
			open={open}
			onClose={dismiss}
			icon={<RotateLeft />}
			title={t('clients.restore.TITLE', { name })}
			consequences={consequences}
			confirmLabel={t('clients.restore.CONFIRM')}
			isPending={isRestoring}
			error={error}
			onConfirm={() => void confirm()}
		/>
	);
}
