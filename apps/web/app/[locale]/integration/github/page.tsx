'use client';

import { useIntegrationTenant, useIntegrationTypes } from '@app/hooks';
import { useGitHubIntegration } from '@app/hooks/integrations/useGitHubIntegration';
import { MyAppProps } from '@app/interfaces/AppProps';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader } from 'lib/components';
import { JitsuRoot } from 'lib/settings/JitsuRoot';
import { useTranslations } from 'next-intl';
import type { AppProps } from 'next/app';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

const GitHub = ({ pageProps }: AppProps<MyAppProps>) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const installation_id = searchParams?.get('installation_id');
	const setup_action = searchParams?.get('setup_action');

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

		if (installation_id && setup_action) {
			setTimeout(() => {
				installGitHub(installation_id as string, setup_action as string).then(() => {
					router.replace('/settings/team#integrations');
				});
			}, 100);
		}
	}, [installGitHub, router, installation_id, setup_action]);

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
		<JitsuRoot pageProps={pageProps}>
			<div className="flex flex-col p-3">
				<BackdropLoader show={true} title={t('common.GITHUB_LOADING_TEXT')} />
			</div>
		</JitsuRoot>
	);
};

export default withAuthentication(GitHub, {
	displayName: 'GitHubIntegrationPage'
});
