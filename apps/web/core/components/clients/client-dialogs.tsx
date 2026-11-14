'use client';

import type { ClientDialogs as ClientDialogsState } from '@/core/hooks/clients/use-client-dialogs';
import type { TClient } from '@/core/types/schemas';
import { ArchiveClientDialog, RestoreClientDialog } from './client-confirm-dialogs';
import { ClientFormDialog } from './client-form-dialog';

interface ClientDialogsProps {
	dialogs: ClientDialogsState;
	/** Offered in the archive and restore toasts, where the client is not already on screen. */
	onOpenClient?: (client: TClient) => void;
}

export function ClientDialogs({ dialogs, onOpenClient }: Readonly<ClientDialogsProps>) {
	return (
		<>
			<ClientFormDialog
				open={dialogs.form.open}
				client={dialogs.form.client}
				focusField={dialogs.form.focusField}
				onClose={dialogs.close}
			/>
			<ArchiveClientDialog
				open={dialogs.archiving.open}
				client={dialogs.archiving.client}
				onClose={dialogs.close}
				onOpenClient={onOpenClient}
			/>
			<RestoreClientDialog
				open={dialogs.restoring.open}
				client={dialogs.restoring.client}
				onClose={dialogs.close}
				onOpenClient={onOpenClient}
			/>
		</>
	);
}
