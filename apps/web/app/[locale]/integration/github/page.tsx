'use client';

import { useIntegrationTenant, useIntegrationTypes } from '@app/hooks';
import { useGitHubIntegration } from '@app/hooks/integrations/useGitHubIntegration';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader } from 'lib/components';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef } from 'react';

const GitHub = () => {
	const router = useRouter();
	const t = useTranslations();

	const installing = useRef<boolean>(false);

	const { installGitHub, getRepositories } = useGitHubIntegration();
	// const { loading: integrationLoading } = useIntegration();
	const { getIntegrationTenant, loading: integrationTenantLoading, integrationTenant } = useIntegrationTenant();

	const { loading: loadingIntegrationTypes, integrationTypes, getIntegrationTypes } = useIntegrationTypes();

	// const params = {
	// 	state: 'http://localhost:3001/integration/github'
	// } as { [x: string]: string };

	// const queries = new URLSearchParams(params || {});
	// const url = `https://github.com/apps/badal-ever-testing-probot/installations/new?${queries.toString()}`;

	const handleInstallGitHub = useCallback(() => {
		installing.current = true;

		if (router && router.query.installation_id && router.query.setup_action) {
			setTimeout(() => {
				installGitHub(router.query.installation_id as string, router.query.setup_action as string).then(() => {
					router.replace('/settings/team#integrations');
				});
			}, 100);
		}
	}, [installGitHub, router]);

	useEffect(() => {
		if (installing.current) {
			return;
		}

		handleInstallGitHub();
	}, [handleInstallGitHub]);

	useEffect(() => {
		if (!integrationTenantLoading && integrationTenant && integrationTenant.length && integrationTenant[0]?.id) {
			getRepositories(integrationTenant[0].id);
		}
	}, [integrationTenantLoading, integrationTenant, getRepositories]);

	useEffect(() => {
		if (!loadingIntegrationTypes && integrationTypes.length === 0) {
			getIntegrationTypes().then((types) => {
				const allIntegrations = types.find((item: any) => item.name === 'All Integrations');
				if (allIntegrations && allIntegrations?.id) {
					getIntegrationTenant('Github');
				}
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
