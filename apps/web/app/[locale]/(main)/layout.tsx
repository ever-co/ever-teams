'use client';
import { AppState } from '@/core/components/layouts/app/init-state';
import { LayoutShell } from '@/core/components/layouts/default-layout/layout-shell';
import { useEmployeePresenceHeartbeat } from '@/core/hooks/users/use-employee-presence-heartbeat';
import OfflineWrapper from '@/core/components/common/offline-wrapper';
import { TaskDrawerMount } from '@/core/components/tasks/drawer/task-drawer-mount';
import { KeyboardShortcutsMount } from '@/core/components/layouts/app/keyboard-shortcuts-mount';
import { RealtimeMount } from '@/core/components/layouts/app/realtime-mount';

export default function MainGroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	useEmployeePresenceHeartbeat();

	// The timer's owner stays mounted while the offline page shows (#5118). Unmounted, its heartbeat stopped, and once
	// mounted again on reconnect it ran the closed-tab check again and stopped the run it had kept alive.
	return (
		<>
			<AppState />
			<OfflineWrapper>
				<KeyboardShortcutsMount />
				<RealtimeMount />
				<LayoutShell>{children}</LayoutShell>
				<TaskDrawerMount />
			</OfflineWrapper>
		</>
	);
}
