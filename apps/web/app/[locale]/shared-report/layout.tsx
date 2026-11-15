import type { Metadata } from 'next';

// A shared report is read without signing in (proxy.ts does not list it as protected) and is not content to index.
// Its link carries the token that opens it: `referrer: 'no-referrer'` renders <meta name="referrer" content="no-referrer">,
// so nothing the page loads or links to is told its address, and error reporting and analytics stay off on these pages
// (isSharedReportPath).
export const metadata: Metadata = {
	referrer: 'no-referrer',
	robots: {
		index: false,
		follow: false
	}
};

export default function SharedReportLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return children;
}
