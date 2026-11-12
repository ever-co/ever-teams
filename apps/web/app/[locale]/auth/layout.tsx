import type { Metadata } from 'next';
import { BoardReturnCapture } from '@/core/components/auth/board-return-capture';

// The auth screens (passcode, password, signup, password recovery, invites, workspace pick, errors)
// are entry points into the app, not content. Without this they were served as indexable duplicates
// in every locale (/auth/passcode, /fr/auth/passcode, ...) on app., stage. and demo.ever.team.
// Declared once here so every page under /[locale]/auth inherits it: no page in this group exports
// its own metadata, and no parent layout sets robots, so nothing overrides it.
// There is deliberately no `googleBot` key: Next emits that as a separate googlebot meta tag, which
// Googlebot also reads, so a second tag could only ever disagree with this one.
export const metadata: Metadata = {
	robots: {
		index: false,
		follow: true
	}
};

// A sign-in the Board app started (`?redirect=<board address>`) ends back on the Board, whichever auth page the
// person finishes on: the address is kept when the first of them opens.
export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<>
			<BoardReturnCapture />
			{children}
		</>
	);
}
