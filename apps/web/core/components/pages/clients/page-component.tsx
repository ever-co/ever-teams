'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Building } from '@/core/components/icons';
import { ClientDialogs } from '@/core/components/clients/client-dialogs';
import { ClientSheet } from '@/core/components/clients/client-sheet';
import { useClientAccess } from '@/core/hooks/clients/use-client-access';
import { useClientDialogs } from '@/core/hooks/clients/use-client-dialogs';
import { useClientPeek } from '@/core/hooks/clients/use-client-peek';
import { useClientViewAccess } from '@/core/hooks/clients/use-client-view-access';
import { useClientsDisplay } from '@/core/hooks/clients/use-clients-display';
import { useClientsListState } from '@/core/hooks/clients/use-clients-list-state';
import { useClientsQuery } from '@/core/hooks/clients/use-clients-query';
import { useListedProjects } from '@/core/hooks/clients/use-listed-projects';
import { useInvoiceAccess } from '@/core/hooks/invoices/use-invoice-access';
import { clientMatchesSearch, clientsInScope, projectCountByClient, sortClients } from '@/core/lib/utils/clients';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import type { TClient } from '@/core/types/schemas';
import { ClientsCards, ClientsCardsSkeleton } from './clients-cards';
import { ClientsList } from './clients-list';
import {
	ClientsEmptyState,
	ClientsErrorState,
	ClientsListSkeleton,
	ClientsNoAccessState,
	ProjectCountsNotice
} from './clients-list-states';
import { ClientsPageSkeleton } from './clients-page-skeleton';
import { ClientsToolbar } from './clients-toolbar';

function ClientsPage() {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const { clients, activeClients, archivedClients, isLoaded, isLoading, isError, refetch } = useClientsQuery({
		includeArchived: true
	});
	const projects = useListedProjects();
	const access = useClientAccess();
	const viewAccess = useClientViewAccess();
	const invoiceAccess = useInvoiceAccess();
	const list = useClientsListState();
	const display = useClientsDisplay();
	const dialogs = useClientDialogs();

	const projectCounts = useMemo(() => projectCountByClient(projects.listedProjects), [projects.listedProjects]);
	const haveProjectCountsFailed = projects.state === 'failed';

	const shownClients = useMemo(() => {
		const scoped = clientsInScope(clients, list.scope);
		const matching = scoped.filter((client) => clientMatchesSearch(client, list.search));
		return sortClients(matching, display.order, projectCounts);
	}, [clients, display.order, list.scope, list.search, projectCounts]);

	const peek = useClientPeek(shownClients, clients);
	const { open: openPeek } = peek;
	const openClient = useCallback((client: TClient) => openPeek(client.id), [openPeek]);

	const counts = { active: activeClients.length, archived: archivedClients.length };
	const isSearching = list.search.trim().length > 0;
	const hasClients = shownClients.length > 0;
	const isRefused = viewAccess.isKnown && !viewAccess.canView;
	// A failed read again keeps the list already read on screen: only a failed first read has nothing to show
	const isFirstReadFailed = isError && !isLoading && !isLoaded;
	const showsError = isFirstReadFailed && !isRefused;
	const isSettled = !isLoading && !isRefused && !showsError;
	const showsEmpty = isSettled && !hasClients;
	const showsList = isSettled && hasClients;
	const showsCards = display.view === 'cards';

	const pageTitle = t('clients.TITLE');
	const breadcrumbPaths = [
		{ title: activeTeam?.name || t('common.ALL_TEAMS'), href: '/' },
		{ title: pageTitle, href: '/clients' }
	];
	const rowProps = {
		projectCounts,
		projectCountsState: projects.state,
		access,
		canCreateInvoice: invoiceAccess.canCreate,
		onEdit: dialogs.edit,
		onArchive: dialogs.archive,
		onRestore: dialogs.restore,
		onOpenClient: openClient
	};

	return (
		<PageLayout
			title={pageTitle}
			showTimer={isTrackingEnabled}
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<Building className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					<Breadcrumb paths={breadcrumbPaths} className="min-w-0 text-sm" />
				</div>
			}
			mainHeaderSlot={
				<ClientsToolbar
					list={list}
					counts={counts}
					shownCount={shownClients.length}
					isLoading={isLoading}
					canCreate={access.canCreate}
					onCreate={dialogs.create}
					display={display}
				/>
			}
		>
			{isRefused && <ClientsNoAccessState />}
			{!isRefused && isLoading && showsCards && <ClientsCardsSkeleton />}
			{!isRefused && isLoading && !showsCards && <ClientsListSkeleton />}
			{showsError && <ClientsErrorState onRetry={() => void refetch()} />}
			{showsEmpty && (
				<ClientsEmptyState
					scope={list.scope}
					isSearching={isSearching}
					canCreate={access.canCreate}
					onClearSearch={() => list.setSearch('')}
					onCreate={dialogs.create}
				/>
			)}
			{showsList && haveProjectCountsFailed && <ProjectCountsNotice onRetry={projects.retry} />}
			{showsList && showsCards && <ClientsCards clients={shownClients} {...rowProps} />}
			{showsList && !showsCards && <ClientsList clients={shownClients} {...rowProps} />}

			<ClientSheet
				client={peek.client}
				isOpen={peek.isOpen}
				neighbours={peek.neighbours}
				onClose={peek.close}
				onPrevious={peek.showPrevious}
				onNext={peek.showNext}
				listedProjects={projects.listedProjects}
				projectsState={projects.state}
				onRetryProjects={projects.retry}
				access={access}
				canCreateInvoice={invoiceAccess.canCreate}
				canViewInvoices={invoiceAccess.canView}
				onEdit={dialogs.edit}
				onArchive={dialogs.archive}
				onRestore={dialogs.restore}
			/>
			<ClientDialogs dialogs={dialogs} onOpenClient={openClient} />
		</PageLayout>
	);
}

export default withAuthentication(ClientsPage, { displayName: 'ClientsPage', skeleton: ClientsPageSkeleton });
