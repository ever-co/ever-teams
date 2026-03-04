'use client';
import { AppState } from '@/core/components/layouts/app/init-state';
import { LayoutShell } from '@/core/components/layouts/default-layout/layout-shell';

export default function MainGroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<>
			<AppState />
			<LayoutShell>{children}</LayoutShell>
		</>
	);
}
