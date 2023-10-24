import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import { GetStaticProps, GetStaticPropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import dynamic from 'next/dynamic';

const Board = dynamic(() => import('lib/features/integrations/boards'), {
	ssr: false,
	loading: () => <BackdropLoader show />
});

function BoardPage() {
	return (
		<>
			<div className="relative">
				<Meta title="Board" />
				<Board />
			</div>
		</>
	);
}
export const getStaticProps: GetStaticProps = async (context: GetStaticPropsContext) => {
	const { locale } = context;
	const translateProps = await serverSideTranslations(locale ?? 'en', ['common']);
	return {
		props: {
			...translateProps
		}
	};
};

export default withAuthentication(BoardPage, {
	displayName: 'BoardPage',
	showPageSkeleton: false
});
