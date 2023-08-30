import { withAuthentication } from 'lib/app/authenticator';
import { Meta } from 'lib/components';
import dynamic from 'next/dynamic';
import React from 'react';

const Excalidraw = dynamic(
	() => import('lib/features/integrations/excalidraw'),
	{
		ssr: false,
	}
);

function WhiteboardPage() {
	return (
		<>
			<div className="relative">
				<Meta title="Whiteboard" />
				<Excalidraw />
			</div>
		</>
	);
}

export default withAuthentication(WhiteboardPage, {
	displayName: 'WhiteboardPage',
});
