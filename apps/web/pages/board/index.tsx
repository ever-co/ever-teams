import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import dynamic from 'next/dynamic';

const Excalidraw = dynamic(() => import('lib/features/integrations/boards'), {
	ssr: false,
	loading: () => <BackdropLoader show />,
});

function WhiteboardPage() {
	return (
		<>
			<div className="relative">
				<Meta title="Board" />
				<Excalidraw />
			</div>
		</>
	);
}

export default withAuthentication(WhiteboardPage, {
	displayName: 'WhiteboardPage',
	showPageSkeleton: false,
});
