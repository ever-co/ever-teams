'use client';

import { useCallback, useMemo } from 'react';
import { invoicesReadOf, newInvoiceHrefOf } from '@/core/components/clients/client-links';
import { useCurrentOrganizationOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useClientStanding } from '@/core/hooks/clients/use-client-standing';
import { useClientTerms } from '@/core/hooks/clients/use-client-terms';
import { clientProjectsPathOf, projectsOfClient, type ListReadState } from '@/core/lib/utils/clients';
import type { TClient, TOrganizationProject } from '@/core/types/schemas';

interface ClientRecordOptions {
	/** The projects the Projects page lists for the active team; the client's are picked among them. */
	listedProjects: ReadonlyArray<TOrganizationProject>;
	projectsState: ListReadState;
	canViewInvoices: boolean;
	canCreateInvoice: boolean;
}

function projectCountOf(state: ListReadState, count: number) {
	if (state !== 'ready') {
		return null;
	}
	return count;
}

export function useClientRecord(client: TClient, options: Readonly<ClientRecordOptions>) {
	const { listedProjects, projectsState, canViewInvoices, canCreateInvoice } = options;
	const organizationRead = useCurrentOrganizationOwner();
	const readClientId = invoicesReadOf(client.id, canViewInvoices);
	const standing = useClientStanding(readClientId, organizationRead.isError);
	const terms = useClientTerms(client.paymentTermsDays);
	const projects = useMemo(() => projectsOfClient(listedProjects, client.id), [client.id, listedProjects]);
	const projectCount = projectCountOf(projectsState, projects.length);
	const newInvoiceHref = newInvoiceHrefOf(client, canCreateInvoice);
	const allProjectsHref = clientProjectsPathOf(client.id);
	const { refetch } = standing;
	const retryInvoices = useCallback(() => void refetch(), [refetch]);

	return { standing, terms, projects, projectCount, newInvoiceHref, allProjectsHref, retryInvoices };
}
