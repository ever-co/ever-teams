'use client';

import { useClientRecord } from '@/core/hooks/clients/use-client-record';
import type { ClientAccess, ListReadState } from '@/core/lib/utils/clients';
import type { TClient, TOrganizationProject } from '@/core/types/schemas';
import { ClientFacts } from './client-facts';
import type { ClientFormField } from './client-form-dialog';
import { ClientHeader } from './client-header';
import { ClientInvoicesSection } from './client-invoices-section';
import { ClientProjectsSection } from './client-projects-section';
import { ClientStandingBand } from './client-standing-band';

export interface ClientSheetBodyProps {
	client: TClient;
	/** The projects the Projects page lists for the active team; the client's are picked among them. */
	listedProjects: ReadonlyArray<TOrganizationProject>;
	projectsState: ListReadState;
	onRetryProjects: () => void;
	access: ClientAccess;
	canCreateInvoice: boolean;
	canViewInvoices: boolean;
	onEdit: (client: TClient, field?: ClientFormField) => void;
	onArchive: (client: TClient) => void;
	onRestore: (client: TClient) => void;
}

export function ClientSheetBody({
	client,
	listedProjects,
	projectsState,
	onRetryProjects,
	access,
	canCreateInvoice,
	canViewInvoices,
	onEdit,
	onArchive,
	onRestore
}: Readonly<ClientSheetBodyProps>) {
	const record = useClientRecord(client, { listedProjects, projectsState, canViewInvoices, canCreateInvoice });
	const { standing } = record;

	return (
		<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
			<div className="flex flex-col gap-6 px-5 pt-2 pb-8">
				<ClientHeader
					client={client}
					size="sheet"
					projectCount={record.projectCount}
					terms={record.terms}
					access={access}
					canCreateInvoice={canCreateInvoice}
					onEdit={onEdit}
					onArchive={onArchive}
					onRestore={onRestore}
				/>
				{canViewInvoices && (
					<ClientStandingBand
						clientName={client.name}
						summary={standing.summary}
						todayKey={standing.todayKey}
						isLoading={standing.isLoading}
						hasFailed={standing.isError}
						onRetry={record.retryInvoices}
						newInvoiceHref={record.newInvoiceHref}
					/>
				)}
				<ClientFacts
					client={client}
					terms={record.terms}
					canEdit={access.canEdit}
					onEdit={onEdit}
					framed={false}
				/>
				{canViewInvoices && (
					<ClientInvoicesSection
						invoices={standing.invoices}
						summary={standing.summary}
						todayKey={standing.todayKey}
						timeZone={standing.timeZone}
						isLoading={standing.isLoading}
						hasFailed={standing.isError}
						onRetry={record.retryInvoices}
						newInvoiceHref={record.newInvoiceHref}
						framed={false}
					/>
				)}
				<ClientProjectsSection
					projects={record.projects}
					state={projectsState}
					onRetry={onRetryProjects}
					allProjectsHref={record.allProjectsHref}
					framed={false}
				/>
			</div>
		</div>
	);
}
