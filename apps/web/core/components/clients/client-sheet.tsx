'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { RecordSheet, RecordSheetBar, useRecordSheetKeys } from '@/core/components/common/record-sheet';
import { Building } from '@/core/components/icons';
import { clientPagePathOf, type ClientNeighbours } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';
import type { ClientSheetBodyProps } from './client-sheet-body';
import { ClientSheetBodySkeleton } from './client-sheet-skeleton';

const ClientSheetBody = dynamic(() => import('./client-sheet-body').then((module) => module.ClientSheetBody), {
	ssr: false,
	loading: () => <ClientSheetBodySkeleton />
});

interface ClientSheetProps extends Omit<ClientSheetBodyProps, 'client'> {
	/** Kept after the sheet closes, so it slides out with its content. */
	client: TClient | null;
	isOpen: boolean;
	neighbours: ClientNeighbours;
	onClose: () => void;
	onPrevious?: () => void;
	onNext?: () => void;
}

function pageHrefOf(client: TClient | null) {
	if (!client) {
		return undefined;
	}
	return clientPagePathOf(client.id);
}

export function ClientSheet({
	client,
	isOpen,
	neighbours,
	onClose,
	onPrevious,
	onNext,
	...bodyProps
}: Readonly<ClientSheetProps>) {
	const t = useTranslations();
	useRecordSheetKeys({ enabled: isOpen, onPrevious, onNext });
	const hasPosition = neighbours.position > 0;
	const title = client?.name ?? t('clients.TITLE');

	const handleOpenChange = (open: boolean) => {
		if (open) {
			return;
		}
		onClose();
	};

	return (
		<RecordSheet open={isOpen} onOpenChange={handleOpenChange} title={title} width="md">
			<RecordSheetBar pageHref={pageHrefOf(client)} onPrevious={onPrevious} onNext={onNext} onClose={onClose}>
				<Building aria-hidden="true" className="size-4 shrink-0" />
				<span className="truncate">{t('clients.TITLE')}</span>
				{hasPosition && (
					<span className="shrink-0 tabular-nums">
						{t('clients.sheet.POSITION', { position: neighbours.position, total: neighbours.total })}
					</span>
				)}
			</RecordSheetBar>
			{client && <ClientSheetBody client={client} {...bodyProps} />}
		</RecordSheet>
	);
}
