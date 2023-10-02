import { useIntegrationTenant, useIntegrationTypes } from '@app/hooks';
import { useGitHubIntegration } from '@app/hooks/integrations/useGitHubIntegration';
import { useIntegration } from '@app/hooks/integrations/useIntegration';
import { withAuthentication } from 'lib/app/authenticator';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const GitHub = () => {
	const router = useRouter();

	const {
		installGitHub,
		installLoading,
		getRepositories,
		integrationGithubRepositories,
		repositoriesLoading,
	} = useGitHubIntegration();
	const {
		getIntegration,
		loading: integrationLoading,
		integration,
	} = useIntegration();
	const {
		getIntegrationTenant,
		loading: integrationTenantLoading,
		integrationTenant,
	} = useIntegrationTenant();

	const {
		loading: loadingIntegrationTypes,
		integrationTypes,
		getIntegrationTypes,
	} = useIntegrationTypes();

	const params = {
		state: 'TEST',
		redirect_uri: 'http://localhost:3001/integration/github',
	} as { [x: string]: string };

	const queries = new URLSearchParams(params || {});
	const url = `https://github.com/apps/badal-ever-testing-probot/installations/new?${queries.toString()}`;

	useEffect(() => {
		if (
			router &&
			router.query.code &&
			router.query.installation_id &&
			router.query.setup_action
		) {
			setTimeout(() => {
				installGitHub(
					router.query.installation_id as string,
					router.query.setup_action as string,
					router.query.code as string
				);
			}, 100);
		}
	}, [installGitHub, router]);

	useEffect(() => {
		if (
			!integrationTenantLoading &&
			integrationTenant &&
			integrationTenant?.id
		) {
			getRepositories(integrationTenant.id);
		}
	}, [integrationTenantLoading, integrationTenant, getRepositories]);

	useEffect(() => {
		if (!loadingIntegrationTypes && integrationTypes.length === 0) {
			getIntegrationTypes().then((types) => {
				// TODO
				const allIntegrations = types.find(
					(item: any) => item.name === 'All Integrations'
				);
				if (allIntegrations && allIntegrations?.id) {
					getIntegrationTenant('Github');
				}
			});
		}
	}, [
		loadingIntegrationTypes,
		integrationTypes,
		getIntegrationTypes,
		getIntegrationTenant,
	]);

	return (
		<div className="flex flex-col p-3">
			{!router.query.code && (
				<Link
					href={url}
					className="bg-primary dark:bg-primary-light text-white text-sm p-3 rounded-xl mb-5 w-52 text-center"
				>
					Connect to GitHub
				</Link>
			)}
			{router.query.code && (
				<p>
					<b>Code (This code is used to get Access/Refresh token):</b>{' '}
					{router.query.code}
				</p>
			)}
			{router.query.installation_id && (
				<p>installation_id: {router.query.installation_id}</p>
			)}

			{integrationGithubRepositories?.repositories.map((item: any) => (
				<div key={item.id}>{item.name}</div>
			))}

			{(loadingIntegrationTypes ||
				integrationLoading ||
				integrationTenantLoading ||
				repositoriesLoading) && <>Loading...</>}
		</div>
	);
};

export default withAuthentication(GitHub, {
	displayName: 'GitHubIntegrationPage',
});
