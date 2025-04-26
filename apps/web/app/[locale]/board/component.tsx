'use client';

import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';

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

export default withAuthentication(BoardPage, {
	displayName: 'BoardIntegrationPage'
});
