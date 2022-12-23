import { useQuery } from '@app/hooks/useQuery';
import { getAuthenticatedUserDataAPI } from '@app/services/client/api';
import { userState } from '@app/stores';
import { GetServerSidePropsContext, NextPage, PreviewData } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { useEffect } from 'react';
import { useRecoilState } from 'recoil';

export function withAuthentication(
	Component: NextPage<any, any>,
	displayName: string
) {
	const AppComponent = (props: any) => {
		const [user, setUser] = useRecoilState(userState);
		const { queryCall, loading } = useQuery(getAuthenticatedUserDataAPI);

		useEffect(() => {
			if (!user) {
				queryCall().then((res) => {
					setUser(res.data.user);
				});
			}
		}, [queryCall, setUser, user]);

		return (
			<>
				{(!user || loading) && (
					<div
						className={`fixed inset-0 w-full h-full flex justify-center items-center transition-all -z-10`}
					>
						<PageSpinner />
					</div>
				)}

				{user && <Component {...props} />}
			</>
		);
	};
	AppComponent.displayName = displayName;

	return AppComponent;
}

function PageSpinner() {
	return (
		<svg
			className={`animate-spin h-10 w-10 dark:text-white text-primary`}
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle
				className="opacity-25"
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="4"
			/>
			<path
				className="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			/>
		</svg>
	);
}

export function getAuthenticationProps(
	context: GetServerSidePropsContext<ParsedUrlQuery, PreviewData>
) {
	let user = null;
	try {
		user = JSON.parse(context.res.getHeader('x-user') as string);
	} catch (_) {
		//
	}
	return { user };
}
