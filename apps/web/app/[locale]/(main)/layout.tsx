'use client';
import { AppState } from '@/core/components/layouts/app/init-state';
import { LayoutShell } from '@/core/components/layouts/default-layout/layout-shell';
import { useEmployeePresenceHeartbeat } from '@/core/hooks/users/use-employee-presence-heartbeat';
import OfflineWrapper from '@/core/components/common/offline-wrapper';
import { TaskDrawerMount } from '@/core/components/tasks/drawer/task-drawer-mount';
import { KeyboardShortcutsMount } from '@/core/components/layouts/app/keyboard-shortcuts-mount';

export default function MainGroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	useEmployeePresenceHeartbeat();

	return (
		<OfflineWrapper>
			<AppState />
			<KeyboardShortcutsMount />
			<LayoutShell>{children}</LayoutShell>
			<TaskDrawerMount />
		</OfflineWrapper>
	);
}
