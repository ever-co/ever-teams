import dynamic from 'next/dynamic';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';

const Jitsi = dynamic(() => import('lib/features/integrations/jitsi'), {
	ssr: false,
	loading: () => <BackdropLoader show />,
});

function CallPage() {
	return (
		<>
			<Meta title="Call" />
			<Jitsi />
		</>
	);
}

export default withAuthentication(CallPage, {
	displayName: 'CallPage',
	showPageSkeleton: false,
});
