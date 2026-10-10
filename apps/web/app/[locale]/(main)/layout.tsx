'use client';
import { AppState } from '@/core/components/layouts/app/init-state';
import { LayoutShell } from '@/core/components/layouts/default-layout/layout-shell';
import OfflineWrapper from '@/core/components/common/offline-wrapper';

export default function MainGroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return (
		<OfflineWrapper>
			<AppState />
			<LayoutShell>{children}</LayoutShell>
		</OfflineWrapper>
	);
}
