'use client';
import { AppState } from '@/core/components/layouts/app/init-state';

export default function MainLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<AppState />
			<>{children}</>
		</>
	);
}
