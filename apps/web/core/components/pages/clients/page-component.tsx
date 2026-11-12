'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Building } from '@/core/components/icons';
import { ClientFormDialog } from '@/core/components/clients/client-form-dialog';
import { ArchiveClientDialog, RestoreClientDialog } from '@/core/components/clients/client-confirm-dialogs';
import { useClientAccess } from '@/core/hooks/clients/use-client-access';
import { useClientsListState } from '@/core/hooks/clients/use-clients-list-state';
import { useClientsQuery } from '@/core/hooks/clients/use-clients-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { isSavedTeamLoading } from '@/core/lib/helpers/saved-team';
import { clientMatchesSearch, clientsInScope, listReadStateOf, projectCountByClient } from '@/core/lib/utils/clients';
import { projectsListedForTeam } from '@/core/lib/utils/project-list';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import type { TClient } from '@/core/types/schemas';
import { ClientsList } from './clients-list';
import { ClientsEmptyState, ClientsErrorState, ClientsListSkeleton, ProjectCountsNotice } from './clients-list-states';
import { ClientsPageSkeleton } from './clients-page-skeleton';
import { ClientsToolbar } from './clients-toolbar';

type ClientDialog =
	| { kind: 'create' }
	| { kind: 'edit'; client: TClient }
	| { kind: 'archive'; client: TClient }
	| { kind: 'restore'; client: TClient };

function clientOf(dialog: ClientDialog | null, kind: 'edit' | 'archive' | 'restore') {
	if (dialog?.kind === kind) {
		return dialog.client;
	}
	return null;
}

function ClientsPage() {
	const t = useTranslations();
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const { clients, activeClients, archivedClients, isLoading, isError, refetch } = useClientsQuery({
		includeArchived: true
	});
	const {
		organizationProjects,
		isOrganizationProjectsLoaded,
		isOrganizationProjectsError,
		refetchOrganizationProjects
	} = useOrganizationProjectsQuery();
	const access = useClientAccess();
	const list = useClientsListState();
	const [dialog, setDialog] = useState<ClientDialog | null>(null);

	const activeTeamId = activeTeam?.id;
	const projectCounts = useMemo(() => {
		const listedProjects = projectsListedForTeam(organizationProjects, activeTeamId);
		return projectCountByClient(listedProjects);
	}, [activeTeamId, organizationProjects]);

	// The counts are the active team's: while the saved team loads they would be every team's, then narrow.
	const isTeamLoading = isSavedTeamLoading(Boolean(activeTeam));
	const hasProjects = organizationProjects.length > 0;
	const haveProjectsArrived = isOrganizationProjectsLoaded || hasProjects;
	const haveProjectsFailed = isOrganizationProjectsError && !haveProjectsArrived;
	const areProjectsRead = haveProjectsArrived && !isTeamLoading;
	const projectCountsState = listReadStateOf(areProjectsRead, haveProjectsFailed);
	const haveProjectCountsFailed = projectCountsState === 'failed';

	const shownClients = useMemo(() => {
		const scoped = clientsInScope(clients, list.scope);
		return scoped.filter((client) => clientMatchesSearch(client, list.search));
	}, [clients, list.scope, list.search]);

	const counts = { active: activeClients.length, archived: archivedClients.length };
	const isSearching = list.search.trim().length > 0;
	const hasClients = shownClients.length > 0;
	const showsError = isError && !isLoading;
	const showsEmpty = !isLoading && !showsError && !hasClients;
	const showsList = !isLoading && !showsError && hasClients;

	const closeDialog = () => setDialog(null);
	const openCreate = () => setDialog({ kind: 'create' });
	const isFormOpen = dialog?.kind === 'create' || dialog?.kind === 'edit';
	const editedClient = clientOf(dialog, 'edit');
	const archivedClient = clientOf(dialog, 'archive');
	const restoredClient = clientOf(dialog, 'restore');

	const pageTitle = t('clients.TITLE');
	const breadcrumbPaths = [
		{ title: activeTeam?.name || t('common.ALL_TEAMS'), href: '/' },
		{ title: pageTitle, href: '/clients' }
	];

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
					onCreate={openCreate}
				/>
			}
		>
			{isLoading && <ClientsListSkeleton />}
			{showsError && <ClientsErrorState onRetry={() => void refetch()} />}
			{showsEmpty && (
				<ClientsEmptyState
					scope={list.scope}
					isSearching={isSearching}
					canCreate={access.canCreate}
					onClearSearch={() => list.setSearch('')}
					onCreate={openCreate}
				/>
			)}
			{showsList && haveProjectCountsFailed && (
				<ProjectCountsNotice onRetry={() => void refetchOrganizationProjects()} />
			)}
			{showsList && (
				<ClientsList
					clients={shownClients}
					projectCounts={projectCounts}
					projectCountsState={projectCountsState}
					access={access}
					onEdit={(client) => setDialog({ kind: 'edit', client })}
					onArchive={(client) => setDialog({ kind: 'archive', client })}
					onRestore={(client) => setDialog({ kind: 'restore', client })}
				/>
			)}

			<ClientFormDialog open={isFormOpen} client={editedClient} onClose={closeDialog} />
			<ArchiveClientDialog open={Boolean(archivedClient)} client={archivedClient} onClose={closeDialog} />
			<RestoreClientDialog open={Boolean(restoredClient)} client={restoredClient} onClose={closeDialog} />
		</PageLayout>
	);
}

export default withAuthentication(ClientsPage, { displayName: 'ClientsPage', skeleton: ClientsPageSkeleton });
