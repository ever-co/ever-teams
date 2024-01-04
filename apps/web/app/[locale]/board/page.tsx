'use client';

import { MyAppProps } from '@app/interfaces/AppProps';
import { withAuthentication } from 'lib/app/authenticator';
import { BackdropLoader, Meta } from 'lib/components';
import { JitsuRoot } from 'lib/settings/JitsuRoot';
import type { AppProps } from 'next/app';
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
			</JitsuRoot>
		</>
	);
}
export default withAuthentication(BoardPage, {
	displayName: 'BoardPage',
	showPageSkeleton: false
});
