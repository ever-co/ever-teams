'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { EntityTile } from '@/core/components/common/entity-tile';
import { PILL_GROUP, PILL_TRIGGER } from '@/core/components/dashboards/kit/recipes';
import { ChevronDown } from '@/core/components/icons';
import { TaskPropertyMenu, type TaskPropertyMenuOption } from '@/core/components/tasks/task-property-menu';
import { cn } from '@/core/lib/helpers';
import type { TClient } from '@/core/types/schemas';

interface InvoiceClientMenuProps {
	clients: ReadonlyArray<TClient>;
	client: Pick<TClient, 'id' | 'name' | 'imageUrl'> | null;
	isLoading: boolean;
	onChange: (clientId: string) => void;
	className?: string;
}

function clientOptionOf(client: TClient): TaskPropertyMenuOption<string> {
	return {
		key: client.id,
		value: client.id,
		label: client.name,
		icon: <EntityTile name={client.name} imageUrl={client.imageUrl} className="size-4 text-[7px]" />
	};
}

/** The client billed, picked from the active clients by name, each with its tile. */
export function InvoiceClientMenu({
	clients,
	client,
	isLoading,
	onChange,
	className
}: Readonly<InvoiceClientMenuProps>) {
	const t = useTranslations();
	const options = useMemo(() => clients.map(clientOptionOf), [clients]);
	const selectedId = client?.id;

	return (
		<div className={cn(PILL_GROUP, 'max-w-full', className)}>
			<TaskPropertyMenu
				options={options}
				isSelected={(value) => value === selectedId}
				onSelect={onChange}
				searchPlaceholder={t('clients.SEARCH_PLACEHOLDER')}
				triggerLabel={t('common.CLIENT')}
				triggerClassName={cn(PILL_TRIGGER, 'max-w-64')}
				popupClassName="w-64"
				disabled={isLoading}
				align="start"
			>
				{client && (
					<>
						<EntityTile name={client.name} imageUrl={client.imageUrl} className="size-5 text-[8px]" />
						<span className="truncate">{client.name}</span>
					</>
				)}
				{!client && (
					<span className="truncate text-muted-foreground">{t('invoices.new.CLIENT_PLACEHOLDER')}</span>
				)}
				<ChevronDown aria-hidden="true" />
			</TaskPropertyMenu>
		</div>
	);
}
