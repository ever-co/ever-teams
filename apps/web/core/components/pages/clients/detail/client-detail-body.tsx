'use client';

import { ClientFacts } from '@/core/components/clients/client-facts';
import type { ClientFormField } from '@/core/components/clients/client-form-dialog';
import { ClientInvoicesSection } from '@/core/components/clients/client-invoices-section';
import { ClientProjectsSection } from '@/core/components/clients/client-projects-section';
import { ClientStandingBand } from '@/core/components/clients/client-standing-band';
import type { useClientRecord } from '@/core/hooks/clients/use-client-record';
import type { ClientAccess, ListReadState } from '@/core/lib/utils/clients';
import type { TClient } from '@/core/types/schemas';

interface ClientDetailBodyProps {
	client: TClient;
	record: ReturnType<typeof useClientRecord>;
	projectsState: ListReadState;
	onRetryProjects: () => void;
	access: ClientAccess;
	canViewInvoices: boolean;
	onEdit: (client: TClient, field?: ClientFormField) => void;
}

/**
 * A client's page: what it owes and its invoices lead the main column, its projects follow; how to reach it and its
 * terms sit in the rail. On a phone the rail comes right after the figures, as in the sheet.
 */
export function ClientDetailBody({
	client,
	record,
	projectsState,
	onRetryProjects,
	access,
	canViewInvoices,
	onEdit
}: Readonly<ClientDetailBodyProps>) {
	const { standing } = record;

	return (
		<div className="mx-auto grid w-full max-w-6xl gap-6 py-2 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr] xl:gap-x-10">
			{canViewInvoices && (
				<ClientStandingBand
					clientName={client.name}
					summary={standing.summary}
					todayKey={standing.todayKey}
					isLoading={standing.isLoading}
					hasFailed={standing.isError}
					onRetry={record.retryInvoices}
					newInvoiceHref={record.newInvoiceHref}
					className="min-w-0 lg:col-start-1"
				/>
			)}
			<aside className="min-w-0 self-start lg:col-start-2 lg:row-span-2 lg:row-start-1">
				<ClientFacts client={client} terms={record.terms} canEdit={access.canEdit} onEdit={onEdit} framed />
			</aside>
			<div className="flex min-w-0 flex-col gap-6 self-start lg:col-start-1">
				{canViewInvoices && (
					<ClientInvoicesSection
						key={client.id}
						invoices={standing.invoices}
						summary={standing.summary}
						todayKey={standing.todayKey}
						timeZone={standing.timeZone}
						isLoading={standing.isLoading}
						hasFailed={standing.isError}
						onRetry={record.retryInvoices}
						newInvoiceHref={record.newInvoiceHref}
						framed
					/>
				)}
				<ClientProjectsSection
					projects={record.projects}
					state={projectsState}
					onRetry={onRetryProjects}
					allProjectsHref={record.allProjectsHref}
					framed
				/>
			</div>
		</div>
	);
}
