'use client';

import { useCallback, useState } from 'react';
import type { ClientFormField } from '@/core/components/clients/client-form-dialog';
import type { TClient } from '@/core/types/schemas';

type ClientDialog =
	| { kind: 'create' }
	| { kind: 'edit'; client: TClient; field?: ClientFormField }
	| { kind: 'archive'; client: TClient }
	| { kind: 'restore'; client: TClient };

function clientOf(dialog: ClientDialog | null, kind: 'edit' | 'archive' | 'restore') {
	if (dialog?.kind === kind) {
		return dialog.client;
	}
	return null;
}

function editedFieldOf(dialog: ClientDialog | null) {
	if (dialog?.kind === 'edit') {
		return dialog.field;
	}
	return undefined;
}

function isFormDialog(dialog: ClientDialog | null) {
	const isCreate = dialog?.kind === 'create';
	const isEdit = dialog?.kind === 'edit';
	return isCreate || isEdit;
}

export function useClientDialogs() {
	const [dialog, setDialog] = useState<ClientDialog | null>(null);
	const [isOpen, setIsOpen] = useState(false);

	const open = useCallback((next: ClientDialog) => {
		setDialog(next);
		setIsOpen(true);
	}, []);
	// The dialog keeps its client while it fades out, so its title never loses the name.
	const close = useCallback(() => setIsOpen(false), []);
	const create = useCallback(() => open({ kind: 'create' }), [open]);
	const edit = useCallback(
		(client: TClient, field?: ClientFormField) => open({ kind: 'edit', client, field }),
		[open]
	);
	const archive = useCallback((client: TClient) => open({ kind: 'archive', client }), [open]);
	const restore = useCallback((client: TClient) => open({ kind: 'restore', client }), [open]);

	const archivedClient = clientOf(dialog, 'archive');
	const restoredClient = clientOf(dialog, 'restore');

	return {
		create,
		edit,
		archive,
		restore,
		close,
		form: {
			open: isOpen && isFormDialog(dialog),
			client: clientOf(dialog, 'edit'),
			focusField: editedFieldOf(dialog)
		},
		archiving: { open: isOpen && Boolean(archivedClient), client: archivedClient },
		restoring: { open: isOpen && Boolean(restoredClient), client: restoredClient }
	};
}

export type ClientDialogs = ReturnType<typeof useClientDialogs>;
