'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { BackdropLoader } from '@/core/components';
import { useGitHubIntegration, useIntegrationTenant, useIntegrationTypes } from '@app/hooks';

/**
 * GitHub integration page component.
 */
const GitHub = () => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const installation_id = searchParams?.get('installation_id');
	const setup_action = searchParams?.get('setup_action');
	const initialLoad = useRef<boolean>(false);
	const installing = useRef<boolean>(false);

	const t = useTranslations();

	const { installGitHub, getRepositories } = useGitHubIntegration();
	const { getIntegrationTenant, loading: integrationTenantLoading, integrationTenant } = useIntegrationTenant();
	const { loading: loadingIntegrationTypes, integrationTypes, getIntegrationTypes } = useIntegrationTypes();

	// Memoize the tenant ID to prevent unnecessary re-renders
	const tenantId = useMemo(() => {
		return integrationTenant?.[0]?.id;
	}, [integrationTenant]);

	// Memoize the installation parameters
	const canInstall = useMemo(() => {
		return !installing.current && installation_id && setup_action;
	}, [installation_id, setup_action]);

	/**
	 * Handle GitHub installation.
	 */
	const handleInstallGitHub = useCallback(() => {
		if (!canInstall) return;

		installing.current = true;
		setTimeout(() => {
			installGitHub(installation_id as string, setup_action as string)
				.then(() => {
					router.replace('/settings/team#integrations');
				})
				.catch((error) => {
					console.error('Failed to install GitHub:', error);
					installing.current = false;
				});
		}, 100);
	}, [canInstall, installGitHub, router, installation_id, setup_action]);

	// Handle GitHub installation
	useEffect(() => {
		if (canInstall) {
			handleInstallGitHub();
		}
	}, [canInstall, handleInstallGitHub]);

	// Handle repository fetching
	useEffect(() => {
		if (!integrationTenantLoading && tenantId) {
			getRepositories(tenantId);
		}
	}, [integrationTenantLoading, tenantId, getRepositories]);

	// Handle integration types initialization
	useEffect(() => {
		const shouldLoadTypes = !loadingIntegrationTypes && integrationTypes.length === 0 && !initialLoad.current;

		if (shouldLoadTypes) {
			initialLoad.current = true;
			getIntegrationTypes()
				.then((types) => {
					const allIntegrations = types.find((item: any) => item.name === 'All Integrations');
					if (allIntegrations?.id) {
						getIntegrationTenant('Github');
					}
				})
				.catch((error) => {
					console.error('Failed to load integration types:', error);
					initialLoad.current = false;
				});
		}
	}, [loadingIntegrationTypes, integrationTypes, getIntegrationTypes, getIntegrationTenant]);

	return (
		<div className="flex flex-col p-3">
			<BackdropLoader show={true} title={t('common.GITHUB_LOADING_TEXT')} />
		</div>
	);
};

export default withAuthentication(GitHub, {
	displayName: 'GitHubIntegrationPage'
});
