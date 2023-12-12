import { CHATWOOT_API_KEY } from '@app/constants';
import React, { useEffect } from 'react';

declare global {
	interface Window {
		chatwootSettings: any;
		chatwootSDK: any;
	}
}

export default function ChatwootWidget() {
	useEffect(() => {
		const websiteToken = CHATWOOT_API_KEY.value;
		if (!websiteToken) {
			return;
		}

		window.chatwootSettings = {
			hideMessageBubble: false,
			position: 'right',
			locale: 'en',
			type: 'standard'
		};

		(function (d, t) {
			const BASE_URL = 'https://app.chatwoot.com';
			const g = d.createElement(t) as HTMLScriptElement;
			const s = d.getElementsByTagName(t)[0];

			g.src = BASE_URL + '/packs/js/sdk.js';
			s.parentNode && s.parentNode.insertBefore(g, s);
			g.async = !0;
			g.onload = function () {
				window.chatwootSDK.run({
					websiteToken: websiteToken,
					baseUrl: BASE_URL
				});
			};
		})(document, 'script');
	}, []);

	return <></>;
}
