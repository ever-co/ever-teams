import type { Metadata } from 'next';

// An invoice's public page is read without signing in (proxy.ts does not list it as protected) and is not content to
// index. Its link carries the token that opens the invoice: `referrer: 'no-referrer'` renders
// <meta name="referrer" content="no-referrer">, so the payment provider the page sends the client to, and anything the
// page loads, is never told its address.
export const metadata: Metadata = {
	referrer: 'no-referrer',
	robots: {
		index: false,
		follow: false
	}
};

export default function SharedInvoiceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return children;
}
