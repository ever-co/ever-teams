import { useIntegrationTenant, useIntegrationTypes } from '@app/hooks';
import { useGitHubIntegration } from '@app/hooks/integrations/useGitHubIntegration';
import { withAuthentication } from 'lib/app/authenticator';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const GitHub = () => {
	const router = useRouter();

	const { installGitHub, getRepositories } = useGitHubIntegration();
	// const { loading: integrationLoading } = useIntegration();
	const { getIntegrationTenant, loading: integrationTenantLoading, integrationTenant } = useIntegrationTenant();

	const { loading: loadingIntegrationTypes, integrationTypes, getIntegrationTypes } = useIntegrationTypes();

	// const params = {
	// 	state: 'http://localhost:3001/integration/github'
	// } as { [x: string]: string };

	// const queries = new URLSearchParams(params || {});
	// const url = `https://github.com/apps/badal-ever-testing-probot/installations/new?${queries.toString()}`;

	useEffect(() => {
		if (router && router.query.installation_id && router.query.setup_action) {
			setTimeout(() => {
				installGitHub(router.query.installation_id as string, router.query.setup_action as string).then(() => {
					router.replace('/settings/team#integrations');
				});
			}, 100);
		}
	}, [installGitHub, router]);

	useEffect(() => {
		if (!integrationTenantLoading && integrationTenant && integrationTenant?.id) {
			getRepositories(integrationTenant.id);
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
			{/* {!router.query.code && (
				<Link
					href={url}
					className="p-3 mb-5 text-sm text-center text-white bg-primary dark:bg-primary-light rounded-xl w-52"
				>
					Connect to GitHub
				</Link>
			)} */}
			{/* {router.query.code && (
				<p>
					<b>Code (This code is used to get Access/Refresh token):</b>{' '}
					{router.query.code}
				</p>
			)}
			{router.query.installation_id && (
				<p>installation_id: {router.query.installation_id}</p>
			)}

			{(loadingIntegrationTypes ||
				integrationLoading ||
				integrationTenantLoading ||
				repositoriesLoading) && <>Loading...</>} */}
		</div>
	);
};

export default withAuthentication(GitHub, {
	displayName: 'GitHubIntegrationPage'
});
