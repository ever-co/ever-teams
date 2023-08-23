import { withAuthentication } from 'lib/app/authenticator';
import Link from 'next/link';
import { useRouter } from 'next/router';

const GitHub = () => {
	const router = useRouter();

	return (
		<div className="flex flex-col p-3">
			{!router.query.code && (
				<Link
					href={'https://github.com/apps/<APP>'}
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
		</div>
	);
};

export default withAuthentication(GitHub, {
	displayName: 'GitHubIntegrationPage',
});
