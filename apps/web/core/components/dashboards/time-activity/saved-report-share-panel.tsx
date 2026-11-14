'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { BillableSwitch } from '@/core/components/common/billable-switch';
import { Spinner } from '@/core/components/common/spinner';
import { Button } from '@/core/components/duplicated-components/_button';
import { Copy, Link } from '@/core/components/icons';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { dayOfKey } from '@/core/lib/utils/dashboards/time-activity-link';
import { shareExpiryDayOf } from '@/core/lib/utils/dashboards/saved-report';
import { dateFormatOf, type FormatLocale } from '@/core/lib/utils/workspace-formats';
import type { ISavedReport } from '@/core/types/interfaces/timesheet/saved-report';

export interface ShareLinkActions {
	isTurningOn: boolean;
	isTurningOff: boolean;
	isSavingAmounts: boolean;
	onTurnOn: (endDay: string | null) => void;
	onTurnOff: () => void;
	onIncludeAmountsChange: (includeAmounts: boolean) => void;
	onCopy: (url: string) => void;
}

function dayText(dayKey: string | null, locale: FormatLocale) {
	const day = dayOfKey(dayKey);
	if (!day) {
		return '';
	}
	return dateFormatOf(locale, { dateStyle: 'medium' }).format(day);
}

function LinkAddress({ url, onCopy }: Readonly<{ url: string; onCopy: (url: string) => void }>) {
	const t = useTranslations();
	const inputId = useId();
	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={inputId} className="sr-only">
				{t('dashboard.savedReports.LINK_ADDRESS')}
			</label>
			<div className="flex gap-2">
				<Input
					id={inputId}
					readOnly
					value={url}
					className="h-8 font-mono text-xs"
					onFocus={(event) => event.target.select()}
				/>
				<Button type="button" size="sm" className="h-8 shrink-0" onClick={() => onCopy(url)}>
					<Copy />
					<span>{t('dashboard.savedReports.COPY')}</span>
				</Button>
			</div>
		</div>
	);
}

function LinkState({
	report,
	url,
	locale,
	onCopy
}: Readonly<{ report: ISavedReport; url: string | null; locale: FormatLocale; onCopy: (url: string) => void }>) {
	const t = useTranslations();
	const endDay = shareExpiryDayOf(report.shareExpiresAt);
	const isOn = Boolean(report.isShared);
	const hasEnded = !isOn && Boolean(report.sharedAt);
	if (hasEnded) {
		return (
			<p className="text-xs text-muted-foreground">
				{t('dashboard.savedReports.LINK_ENDED', { date: dayText(endDay, locale) })}
			</p>
		);
	}
	if (!isOn) {
		return <p className="text-xs text-muted-foreground">{t('dashboard.savedReports.LINK_OFF')}</p>;
	}
	return (
		<div className="flex flex-col gap-2">
			{url && <LinkAddress url={url} onCopy={onCopy} />}
			{!url && <p className="text-xs text-muted-foreground">{t('dashboard.savedReports.LINK_HIDDEN')}</p>}
			{endDay && (
				<p className="text-xs text-muted-foreground">
					{t('dashboard.savedReports.EXPIRES', { date: dayText(endDay, locale) })}
				</p>
			)}
		</div>
	);
}

function EndDayField({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
	const t = useTranslations();
	const inputId = useId();
	const hintId = useId();
	const today = localDayKeyOf(new Date());
	return (
		<div className="flex flex-col gap-1">
			<label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
				{t('dashboard.savedReports.ENDS_ON')}
			</label>
			<Input
				id={inputId}
				type="date"
				min={today}
				value={value}
				aria-describedby={hintId}
				className="h-8"
				onChange={(event) => onChange(event.target.value)}
			/>
			<p id={hintId} className="text-xs text-muted-foreground">
				{t('dashboard.savedReports.ENDS_ON_HINT')}
			</p>
		</div>
	);
}

function LinkButtons({
	isOn,
	actions,
	endDay
}: Readonly<{ isOn: boolean; actions: ShareLinkActions; endDay: string }>) {
	const t = useTranslations();
	const endOrNone = endDay || null;
	const isBusy = actions.isTurningOn || actions.isTurningOff;
	if (!isOn) {
		return (
			<div className="flex justify-end">
				<Button type="button" size="sm" disabled={isBusy} onClick={() => actions.onTurnOn(endOrNone)}>
					{actions.isTurningOn && <Spinner className="size-3.5" />}
					{!actions.isTurningOn && <Link />}
					<span>{t('dashboard.savedReports.TURN_ON')}</span>
				</Button>
			</div>
		);
	}
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex flex-wrap justify-end gap-2">
				<Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={actions.onTurnOff}>
					{actions.isTurningOff && <Spinner className="size-3.5" />}
					<span>{t('dashboard.savedReports.TURN_OFF')}</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={isBusy}
					onClick={() => actions.onTurnOn(endOrNone)}
				>
					{actions.isTurningOn && <Spinner className="size-3.5" />}
					<span>{t('dashboard.savedReports.REPLACE')}</span>
				</Button>
			</div>
			<p className="text-right text-xs text-muted-foreground">{t('dashboard.savedReports.REPLACE_HINT')}</p>
		</div>
	);
}

/**
 * The link of a saved report: turned on (with an optional last day and the choice of amounts), copied, replaced or
 * turned off. A new address is shown once, when it is made: only its digest is stored, so after a reload the panel
 * says the link is on and offers to replace it.
 */
export function SavedReportSharePanel({
	report,
	url,
	locale,
	actions
}: Readonly<{ report: ISavedReport; url: string | null; locale: FormatLocale; actions: ShareLinkActions }>) {
	const t = useTranslations();
	const [endDay, setEndDay] = useState(() => shareExpiryDayOf(report.shareExpiresAt) ?? '');
	const isOn = Boolean(report.isShared);
	return (
		<div className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<p className="text-[13px] font-medium text-foreground">{t('dashboard.savedReports.SHARE_TITLE')}</p>
				<p className="truncate text-xs text-muted-foreground" title={report.name}>
					{report.name}
				</p>
			</div>
			<p className="text-xs text-muted-foreground">{t('dashboard.savedReports.SHARE_HINT')}</p>
			<LinkState report={report} url={url} locale={locale} onCopy={actions.onCopy} />
			<EndDayField value={endDay} onChange={setEndDay} />
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<BillableSwitch
						isBillable={Boolean(report.includeAmounts)}
						onChange={actions.onIncludeAmountsChange}
						label={t('dashboard.savedReports.INCLUDE_AMOUNTS')}
					/>
					{actions.isSavingAmounts && <Spinner className="size-3.5" />}
				</div>
				<p className="text-xs text-muted-foreground">{t('dashboard.savedReports.INCLUDE_AMOUNTS_HINT')}</p>
			</div>
			<LinkButtons isOn={isOn} actions={actions} endDay={endDay} />
		</div>
	);
}
