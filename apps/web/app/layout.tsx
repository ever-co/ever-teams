import { ReactNode } from 'react';

import '@/styles/globals.css';
import 'react-loading-skeleton/dist/skeleton.css';
import { Toaster } from '@/core/components/common/sonner';
type Props = {
	children: ReactNode;
};

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout({ children }: Readonly<Props>) {
	return (
		<>
			{children}
			<Toaster />
		</>
	);
}
