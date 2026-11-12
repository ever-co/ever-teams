'use client';

import { type ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DashboardErrorNotice } from '@/core/components/dashboards/kit/dashboard-states';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useInvoiceAccess } from '@/core/hooks/invoices/use-invoice-access';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { queryKeys } from '@/core/query/keys';

export type InvoiceAccessNeed = 'view' | 'create';

export const INVOICES_PATH = '/invoices';

export const NEW_INVOICE_PATH = '/invoices/new';

/** A new invoice with its client picked already. */
export function newInvoicePathOf(clientId: string) {
	const query = new URLSearchParams({ client: clientId });
	return `${NEW_INVOICE_PATH}?${query.toString()}`;
}

const HOME_PATH = '/';

interface AccessFlags {
	canView: boolean;
	canCreate: boolean;
}

function isGranted(need: InvoiceAccessNeed, access: AccessFlags) {
	if (need === 'create') {
		return access.canCreate;
	}
	return access.canView;
}

/** A role that reads the invoices without creating them goes back to the list; any other refusal leaves Invoices. */
function refusalPathOf(need: InvoiceAccessNeed, access: AccessFlags) {
	const keepsTheList = need === 'create' && access.canView;
	if (keepsTheList) {
		return INVOICES_PATH;
	}
	return HOME_PATH;
}

function InvoiceAccessError() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const retry = () => {
		void queryClient.invalidateQueries({ queryKey: queryKeys.roles.myPermissions(getTenantIdCookie()) });
	};
	return (
		<PageLayout title={t('invoices.TITLE')}>
			<DashboardErrorNotice title={t('invoices.ACCESS_ERROR_TITLE')} onRetry={retry} />
		</PageLayout>
	);
}

/**
 * Invoices state client rates: the pages render for a role that may read them and send anyone else away. This is the
 * page's own check; the API and the proxy routes refuse the same roles by themselves.
 */
export function InvoiceAccessGuard({
	need,
	fallback,
	children
}: Readonly<{ need: InvoiceAccessNeed; fallback: ReactNode; children: ReactNode }>) {
	const router = useRouter();
	const access = useInvoiceAccess();
	const isAllowed = isGranted(need, access);
	const isRefused = access.isLoaded && !isAllowed;
	const refusalPath = refusalPathOf(need, access);

	useEffect(() => {
		if (isRefused) {
			router.replace(refusalPath);
		}
	}, [isRefused, refusalPath, router]);

	if (access.hasFailed) {
		return <InvoiceAccessError />;
	}
	if (!access.isLoaded || isRefused) {
		return <>{fallback}</>;
	}
	return <>{children}</>;
}
