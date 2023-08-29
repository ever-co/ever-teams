import { withAuthentication } from 'lib/app/authenticator';
import dynamic from 'next/dynamic';
import React from 'react';

const Excalidraw = dynamic(
	() => import('lib/features/integrations/excalidraw'),
	{
		ssr: false,
	}
);

function WhiteboardPage() {
	return <Excalidraw />;
}

export default withAuthentication(WhiteboardPage, {
	displayName: 'WhiteboardPage',
});
