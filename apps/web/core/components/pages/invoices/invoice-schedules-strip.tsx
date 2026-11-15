'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { DASHBOARD_SURFACE } from '@/core/components/dashboards/kit/recipes';
import { useInvoiceSchedules } from '@/core/hooks/invoices/use-invoice-schedules';
import { cn } from '@/core/lib/helpers';
import { clientPagePathOf } from '@/core/lib/utils/clients';
import { compareSchedulesByNextRun, isPausedSchedule } from '@/core/lib/utils/invoice-schedules';
import { invoiceDayTextOf } from '@/core/lib/utils/invoices';
import type { TInvoiceSchedule } from '@/core/types/schemas/organization/invoice-schedule.schema';

function ScheduleChip({ schedule }: Readonly<{ schedule: TInvoiceSchedule }>) {
	const t = useTranslations();
	const locale = useLocale();
	const name = schedule.organizationContact?.name?.trim() || t('invoices.NO_CLIENT');
	const frequency = t(`invoices.schedule.frequency.${schedule.frequency}`);
	const nextDay = schedule.nextPeriod?.runDay;
	let when = t('invoices.schedule.LIST_PAUSED');
	if (!isPausedSchedule(schedule) && nextDay) {
		when = t('invoices.schedule.LIST_NEXT', { day: invoiceDayTextOf(nextDay, locale) ?? nextDay });
	}
	return (
		<li>
			<Link
				href={clientPagePathOf(schedule.organizationContactId)}
				className="flex min-w-0 flex-col rounded-md px-2.5 py-1.5 outline-none transition-colors hover:bg-foreground/[0.04] focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<span className="truncate text-[13px] font-medium text-foreground">{name}</span>
				<span className="truncate text-xs text-muted-foreground">
					{frequency} · {when}
				</span>
			</Link>
		</li>
	);
}

/**
 * The clients billed on a schedule, above the invoices: who, how often, and when the next invoice is made. Each opens
 * the client's page, where the schedule is set and its runs are listed. Nothing shows while no client has one.
 */
export function InvoiceSchedulesStrip() {
	const t = useTranslations();
	const { schedules } = useInvoiceSchedules({ enabled: true });
	const sorted = useMemo(() => [...schedules].sort(compareSchedulesByNextRun), [schedules]);
	if (sorted.length === 0) {
		return null;
	}
	return (
		<section
			aria-label={t('invoices.schedule.LIST_TITLE')}
			className={cn(DASHBOARD_SURFACE, 'flex flex-col gap-1 px-2 py-2.5')}
		>
			<h2 className="px-2.5 text-xs font-medium text-muted-foreground">
				{t('invoices.schedule.LIST_TITLE')} · {sorted.length}
			</h2>
			<ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2 xl:grid-cols-4">
				{sorted.map((schedule) => (
					<ScheduleChip key={schedule.id} schedule={schedule} />
				))}
			</ul>
		</section>
	);
}
