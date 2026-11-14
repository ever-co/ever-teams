'use client';

import type { ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { ClientDialogs } from '@/core/components/clients/client-dialogs';
import { ClientHeader } from '@/core/components/clients/client-header';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Building } from '@/core/components/icons';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useClientAccess } from '@/core/hooks/clients/use-client-access';
import { useClientDialogs } from '@/core/hooks/clients/use-client-dialogs';
import { useClientRecord } from '@/core/hooks/clients/use-client-record';
import { useClientViewAccess } from '@/core/hooks/clients/use-client-view-access';
import { useClientsQuery } from '@/core/hooks/clients/use-clients-query';
import { useListedProjects } from '@/core/hooks/clients/use-listed-projects';
import { useInvoiceAccess } from '@/core/hooks/invoices/use-invoice-access';
import { clientPagePathOf, type ClientAccess } from '@/core/lib/utils/clients';
import { activeTeamState, isTrackingEnabledState } from '@/core/stores';
import type { TClient } from '@/core/types/schemas';
import { ClientsNoAccessState } from '../clients-list-states';
import { ClientDetailBody } from './client-detail-body';
import { ClientDetailBodySkeleton, ClientDetailHeaderSkeleton } from './client-detail-skeleton';

const CLIENTS_PATH = '/clients';

interface ClientRecordViewProps {
	client: TClient;
	access: ClientAccess;
	breadcrumb: ReactNode;
}

function ClientRecordView({ client, access, breadcrumb }: Readonly<ClientRecordViewProps>) {
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const invoiceAccess = useInvoiceAccess();
	const projects = useListedProjects();
	const dialogs = useClientDialogs();
	const record = useClientRecord(client, {
		listedProjects: projects.listedProjects,
		projectsState: projects.state,
		canViewInvoices: invoiceAccess.canView,
		canCreateInvoice: invoiceAccess.canCreate
	});

	return (
		<PageLayout
			title={client.name}
			showTimer={isTrackingEnabled}
			breadcrumb={breadcrumb}
			mainHeaderSlot={
				<div className="px-4 py-3">
					<ClientHeader
						client={client}
						size="page"
						projectCount={record.projectCount}
						terms={record.terms}
						access={access}
						canCreateInvoice={invoiceAccess.canCreate}
						onEdit={dialogs.edit}
						onArchive={dialogs.archive}
						onRestore={dialogs.restore}
					/>
				</div>
			}
		>
			<ClientDetailBody
				client={client}
				record={record}
				projectsState={projects.state}
				onRetryProjects={projects.retry}
				access={access}
				canViewInvoices={invoiceAccess.canView}
				onEdit={dialogs.edit}
			/>
			<ClientDialogs dialogs={dialogs} />
		</PageLayout>
	);
}

export function ClientDetailPageComponent() {
	const t = useTranslations();
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const clientId = params?.id ?? '';
	const activeTeam = useAtomValue(activeTeamState);
	const isTrackingEnabled = useAtomValue(isTrackingEnabledState);
	const viewAccess = useClientViewAccess();
	const access = useClientAccess();
	const { clients, isLoaded, isLoading, isError, refetch } = useClientsQuery({ includeArchived: true });

	const client = clients.find((candidate) => candidate.id === clientId) ?? null;
	const clientsTitle = t('clients.TITLE');
	const breadcrumbPaths = [
		{ title: activeTeam?.name || t('common.ALL_TEAMS'), href: '/' },
		{ title: clientsTitle, href: CLIENTS_PATH },
		{ title: client?.name || t('common.LOADING'), href: clientPagePathOf(clientId) }
	];
	const breadcrumb = (
		<div className="flex min-w-0 items-center gap-2">
			<Building className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			<Breadcrumb paths={breadcrumbPaths} className="min-w-0 text-sm" />
		</div>
	);

	const isRefused = viewAccess.isKnown && !viewAccess.canView;
	// A failed read again keeps the client already read on screen: only a failed first read has nothing to show
	const isFirstReadFailed = isError && !isLoading && !isLoaded;
	const isMissing = isLoaded && !client;

	if (client && !isRefused) {
		return <ClientRecordView client={client} access={access} breadcrumb={breadcrumb} />;
	}

	let content: ReactNode = <ClientDetailBodySkeleton />;
	let header: ReactNode = <ClientDetailHeaderSkeleton />;
	if (isRefused) {
		content = <ClientsNoAccessState />;
	} else if (isFirstReadFailed) {
		content = (
			<AnimatedEmptyState
				title={t('clients.ERROR_TITLE')}
				message={t('clients.ERROR_MESSAGE')}
				actionLabel={t('pages.unauthorized.TRY_AGAIN')}
				actionVariant="outline"
				onAction={() => void refetch()}
				minHeight="420px"
			/>
		);
	} else if (isMissing) {
		content = (
			<AnimatedEmptyState
				title={t('clients.detail.NOT_FOUND_TITLE')}
				message={t('clients.detail.NOT_FOUND_MESSAGE')}
				icon={<Building />}
				actionLabel={t('clients.detail.ALL_CLIENTS')}
				actionVariant="outline"
				onAction={() => router.push(CLIENTS_PATH)}
				minHeight="420px"
			/>
		);
	}
	const showsHeaderSkeleton = !isRefused && !isFirstReadFailed && !isMissing;
	if (!showsHeaderSkeleton) {
		header = undefined;
	}

	return (
		<PageLayout title={clientsTitle} showTimer={isTrackingEnabled} breadcrumb={breadcrumb} mainHeaderSlot={header}>
			{content}
		</PageLayout>
	);
}
