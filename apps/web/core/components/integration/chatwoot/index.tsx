import { CHATWOOT_API_KEY } from '@/core/constants/config/constants';
import { useEffect } from 'react';
import { readRuntimeEnv } from '@/env-config';

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
			// Self-hosted Chatwoot: NEXT_PUBLIC_CHATWOOT_BASE_URL (read at runtime) overrides Chatwoot Cloud.
			const chatwootOverride =
				readRuntimeEnv('NEXT_PUBLIC_CHATWOOT_BASE_URL') || process.env.NEXT_PUBLIC_CHATWOOT_BASE_URL || '';
			let chatwootOrigin = chatwootOverride.trim();
			while (chatwootOrigin.endsWith('/')) chatwootOrigin = chatwootOrigin.slice(0, -1);
			chatwootOrigin = chatwootOrigin || BASE_URL;
			const g = d.createElement(t) as HTMLScriptElement;
			const s = d.getElementsByTagName(t)[0];

			g.src = chatwootOrigin + '/packs/js/sdk.js';
			s.parentNode && s.parentNode.insertBefore(g, s);
			g.async = !0;
			g.onload = function () {
				window.chatwootSDK.run({
					websiteToken: websiteToken,
					baseUrl: chatwootOrigin
				});
			};
		})(document, 'script');
	}, []);

	return <></>;
}
