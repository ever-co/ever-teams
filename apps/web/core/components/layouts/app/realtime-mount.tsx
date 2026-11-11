'use client';

import { RealtimeStatus } from '@/core/components/common/realtime-status';
import { useInboxAlerts } from '@/core/hooks/inbox/use-inbox-alerts';
import { useRealtimeClient } from '@/core/hooks/realtime/use-realtime-client';
import { useRealtimePresence } from '@/core/hooks/realtime/use-realtime-presence';

/**
 * Mounts the tab's live connection once for the whole shell (the main layout), with its presence signals, the
 * sound of a new inbox entry (one tab plays it) and the reconnecting note. With the feature off it renders nothing
 * and opens nothing.
 */
export function RealtimeMount() {
	useRealtimeClient();
	useRealtimePresence();
	useInboxAlerts();

	return <RealtimeStatus />;
}
