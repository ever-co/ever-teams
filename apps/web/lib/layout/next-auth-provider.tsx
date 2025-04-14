'use client';

import { SessionProvider } from 'next-auth/react';

type Props = {
	children: React.ReactNode;
};

export default function NextAuthSessionProvider({ children }: Props) {
	//@ts-ignore
	return <SessionProvider>{children}</SessionProvider>;
}
