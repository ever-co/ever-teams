import { userState } from '@app/stores';
import { GetServerSidePropsContext, NextPage, PreviewData } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';

export function withAuthentication(
	Component: NextPage<any, any>,
	displayName: string
) {
	const AppComponent = (props: any) => {
		const setUser = useSetRecoilState(userState);

		useEffect(() => {
			setUser(props.user);
		}, [props.user, setUser]);

		return <Component {...props} />;
	};
	AppComponent.displayName = displayName;

	return AppComponent;
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
