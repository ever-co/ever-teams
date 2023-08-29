import dynamic from 'next/dynamic';
import { withAuthentication } from 'lib/app/authenticator';

const Jitsi = dynamic(() => import('lib/features/integrations/jitsi'), {
	ssr: false,
});

function CallPage() {
	return (
		<div className="">
			<Jitsi />
		</div>
	);
}

export default withAuthentication(CallPage, { displayName: 'CallPage' });
