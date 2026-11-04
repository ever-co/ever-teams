'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { Meta } from '@/core/components';
import '@excalidraw/excalidraw/index.css';
import { LazyBoard as Board } from '@/core/components/optimized-components/common';
import { BoardPageSkeleton } from './board-page-skeleton';

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
	displayName: 'BoardIntegrationPage',
	skeleton: BoardPageSkeleton
});
