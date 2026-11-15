'use client';

import { SharedReportPage } from '@/core/components/pages/shared-report/shared-report-page';
import { useSharedReportToken } from '@/core/hooks/dashboards/time-activity/use-shared-report-token';

/**
 * A saved report read through its read-only link (ever-co/ever-teams#5200): no account, no navigation. The link is
 * `/shared-report#token=<token>`: the token stays in the fragment, which the browser never sends to this server.
 */
export default function SharedReport() {
	const token = useSharedReportToken();
	return <SharedReportPage token={token} />;
}
