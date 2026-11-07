'use client';

import { useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { SettingsRow, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { SettingsSwitch } from '@/core/components/settings/kit/settings-switch';
import { cn } from '@/core/lib/helpers';
import {
	browserTimeZone,
	DEFAULT_QUIET_HOURS,
	digestHourLabel,
	isTimeOfDay,
	NOTIFICATION_EMAIL_MODES
} from '@/core/lib/notifications/notification-preferences';
import { INotificationQuietHours, TNotificationEmailMode } from '@/core/types/interfaces/common/employee-notification';

const MODE_KEYS = {
	immediate: 'notifications.SETTINGS_PAGE.CHANNELS.MODE_IMMEDIATE',
	digest: 'notifications.SETTINGS_PAGE.CHANNELS.MODE_DIGEST',
	off: 'notifications.SETTINGS_PAGE.CHANNELS.MODE_OFF'
} as const;

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

type EmailModeSelectProps = {
	id?: string;
	value: TNotificationEmailMode;
	disabled?: boolean;
	ariaLabel?: string;
	className?: string;
	onChange: (mode: TNotificationEmailMode) => void;
};

/** At once, in the daily digest, or never. */
export function EmailModeSelect({ id, value, disabled, ariaLabel, className, onChange }: Readonly<EmailModeSelectProps>) {
	const t = useTranslations();
	return (
		<Select value={value} onValueChange={(next) => onChange(next as TNotificationEmailMode)} disabled={disabled}>
			<SelectTrigger id={id} aria-label={ariaLabel} className={cn('h-8 text-[13px]', className ?? 'w-full sm:w-44')}>
				<SelectValue>{t(MODE_KEYS[value])}</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{NOTIFICATION_EMAIL_MODES.map((mode) => (
					<SelectItem key={mode} value={mode} className="text-[13px]">
						{t(MODE_KEYS[mode])}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

type EmailDefaultRowProps = {
	value: TNotificationEmailMode;
	disabled?: boolean;
	onChange: (mode: TNotificationEmailMode) => void;
};

/** The email mode of every kind, unless a kind's row says otherwise. */
export function EmailDefaultRow({ value, disabled, onChange }: Readonly<EmailDefaultRowProps>) {
	const t = useTranslations();
	const triggerId = useId();
	return (
		<SettingsSurface>
			<SettingsRow
				label={t('notifications.SETTINGS_PAGE.CHANNELS.DEFAULT_LABEL')}
				description={t('notifications.SETTINGS_PAGE.CHANNELS.DEFAULT_TEXT')}
				htmlFor={triggerId}
			>
				<EmailModeSelect id={triggerId} value={value} disabled={disabled} onChange={onChange} />
			</SettingsRow>
		</SettingsSurface>
	);
}

type QuietHoursRowProps = {
	window: INotificationQuietHours | null;
	disabled?: boolean;
	onChange: (window: INotificationQuietHours | null) => void;
};

/**
 * Quiet hours: a switch, and the window's start and end once on. The times are saved when the field is left, in
 * the browser's time zone (named in the text); the row is keyed by the saved window, so a draft resets with it.
 */
export function QuietHoursRow({ window, disabled, onChange }: Readonly<QuietHoursRowProps>) {
	const t = useTranslations();
	const switchId = useId();
	const fromId = `${switchId}-from`;
	const toId = `${switchId}-to`;
	const [start, setStart] = useState(window?.start ?? DEFAULT_QUIET_HOURS.start);
	const [end, setEnd] = useState(window?.end ?? DEFAULT_QUIET_HOURS.end);
	const timeZone = window?.timeZone || browserTimeZone();
	const isOn = window !== null;

	const save = (next: { start: string; end: string }) => {
		if (!isTimeOfDay(next.start) || !isTimeOfDay(next.end)) {
			return;
		}
		if (next.start === window?.start && next.end === window?.end) {
			return;
		}
		onChange({ start: next.start, end: next.end, timeZone });
	};

	return (
		<SettingsRow
			label={t('notifications.SETTINGS_PAGE.CHANNELS.QUIET_LABEL')}
			description={t('notifications.SETTINGS_PAGE.CHANNELS.QUIET_TEXT', { timeZone })}
			htmlFor={switchId}
			controlClassName="flex-wrap"
		>
			{isOn && (
				<span className="flex items-center gap-2 text-xs text-muted-foreground">
					<label htmlFor={fromId}>{t('notifications.SETTINGS_PAGE.CHANNELS.QUIET_FROM')}</label>
					<Input
						id={fromId}
						type="time"
						value={start}
						disabled={disabled}
						className="h-8 w-28 text-[13px]"
						onChange={(event) => setStart(event.target.value)}
						onBlur={() => save({ start, end })}
					/>
					<label htmlFor={toId}>{t('notifications.SETTINGS_PAGE.CHANNELS.QUIET_TO')}</label>
					<Input
						id={toId}
						type="time"
						value={end}
						disabled={disabled}
						className="h-8 w-28 text-[13px]"
						onChange={(event) => setEnd(event.target.value)}
						onBlur={() => save({ start, end })}
					/>
				</span>
			)}
			<SettingsSwitch
				id={switchId}
				checked={isOn}
				pending={disabled}
				onCheckedChange={(next) => onChange(next ? { ...DEFAULT_QUIET_HOURS, timeZone: browserTimeZone() } : null)}
			/>
		</SettingsRow>
	);
}

type DigestHourRowProps = {
	value: number;
	disabled?: boolean;
	onChange: (hour: number) => void;
};

/** The hour of the day the digest goes out. */
export function DigestHourRow({ value, disabled, onChange }: Readonly<DigestHourRowProps>) {
	const t = useTranslations();
	const locale = useLocale();
	const triggerId = useId();
	return (
		<SettingsRow
			label={t('notifications.SETTINGS_PAGE.CHANNELS.DIGEST_LABEL')}
			description={t('notifications.SETTINGS_PAGE.CHANNELS.DIGEST_TEXT')}
			htmlFor={triggerId}
		>
			<Select value={String(value)} onValueChange={(next) => onChange(Number(next))} disabled={disabled}>
				<SelectTrigger id={triggerId} className="h-8 w-full text-[13px] sm:w-32">
					<SelectValue>{digestHourLabel(value, locale)}</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{HOURS.map((hour) => (
						<SelectItem key={hour} value={String(hour)} className="text-[13px]">
							{digestHourLabel(hour, locale)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</SettingsRow>
	);
}
