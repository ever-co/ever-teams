'use client';

import { RealtimeStatus } from '@/core/components/common/realtime-status';
import { useRealtimeClient } from '@/core/hooks/realtime/use-realtime-client';
import { useRealtimePresence } from '@/core/hooks/realtime/use-realtime-presence';

/**
 * Mounts the tab's live connection once for the whole shell (the main layout), with its presence signals and
 * the reconnecting note. With the feature off it renders nothing and opens nothing.
 */
export function RealtimeMount() {
	useRealtimeClient();
	useRealtimePresence();

	return <RealtimeStatus />;
}
