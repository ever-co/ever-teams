'use client';

import { useParams } from 'next/navigation';
import { SharedReportPage } from '@/core/components/pages/shared-report/shared-report-page';

/** A saved report read through its read-only link (ever-co/ever-teams#5200): no account, no navigation. */
export default function SharedReport() {
	const params = useParams<{ token: string }>();
	const token = params?.token ?? '';
	return <SharedReportPage token={token} />;
}
