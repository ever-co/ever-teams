'use client';
import { AppState } from '@/core/components/layouts/app/init-state';
import { LayoutShell } from '@/core/components/layouts/default-layout/layout-shell';
import { useEmployeePresenceHeartbeat } from '@/core/hooks/users/use-employee-presence-heartbeat';

export default function MainGroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	useEmployeePresenceHeartbeat();

	return (
		<>
			<AppState />
			<LayoutShell>{children}</LayoutShell>
		</>
	);
}
