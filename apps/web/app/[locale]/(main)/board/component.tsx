'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { BackdropLoader, Meta } from '@/core/components';
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';

const Board = dynamic(() => import('@/core/components/features/integrations/boards'), {
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
