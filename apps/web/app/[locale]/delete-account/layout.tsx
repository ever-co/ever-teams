import type { Metadata } from 'next';

// The account deletion pages are public (no sign-in; proxy.ts does not list them as protected) and are not content.
// `referrer: 'no-referrer'` renders <meta name="referrer" content="no-referrer">: nothing the confirm page loads or
// links to is told its address. next.config.js also sends a Referrer-Policy: no-referrer header for these routes.
// The e-mailed token sits in the URL fragment (never sent to a server) and the page removes it on load
// (core/lib/auth/account-deletion.ts); Sentry and PostHog stay off on these routes (isAccountDeletionPath).
export const metadata: Metadata = {
	referrer: 'no-referrer',
	robots: {
		index: false,
		follow: false
	}
};

export default function DeleteAccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return children;
}
