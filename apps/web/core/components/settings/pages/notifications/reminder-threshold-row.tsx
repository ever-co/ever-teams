'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { NotificationTypeBadge } from '@/core/components/notifications/notification-type-badge';
import { SettingsRow } from '@/core/components/settings/kit/settings-page';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { EmailModeChoice, EmailModeSelect } from './notification-channel-rows';

const OFF = 'off';

export interface ReminderThresholdRowProps {
	/** The threshold in hours, null for no reminder. */
	value: number | null;
	disabled?: boolean;
	onChange: (hours: number | null) => void;
	/** How the reminders reach the person by email, as every other kind's row offers it. */
	emailMode: EmailModeChoice;
	onEmailMode: (mode: EmailModeChoice) => void;
}

interface ReminderThresholdCopy {
	type: EEmployeeNotificationType;
	/** The thresholds offered, in hours. */
	choices: readonly number[];
	label: string;
	description: string;
	/** The name of a threshold, or of none (off). */
	labelOf: (hours: number | null) => string;
}

/**
 * A reminder the platform sends after, or before, a number of hours (#5022): off, or one of the thresholds offered; and,
 * while it is on, the email mode of the reminders, as each kind's row of the page has it.
 */
export function ReminderThresholdRow({
	type,
	choices: offered,
	label,
	description,
	labelOf,
	value,
	disabled,
	onChange,
	emailMode,
	onEmailMode
}: Readonly<ReminderThresholdRowProps & ReminderThresholdCopy>) {
	const t = useTranslations();
	const triggerId = useId();
	// A threshold saved elsewhere that the list does not offer is still shown as chosen
	const choices = value === null || offered.includes(value) ? offered : [...offered, value].sort((a, b) => a - b);

	return (
		<SettingsRow
			label={label}
			description={description}
			leading={<NotificationTypeBadge type={type} size="md" />}
			htmlFor={triggerId}
			controlClassName="flex-wrap"
		>
			{value !== null && (
				<EmailModeSelect
					value={emailMode}
					allowDefault
					disabled={disabled}
					ariaLabel={`${t('notifications.SETTINGS_PAGE.CHANNELS.MODE_LABEL')}: ${label}`}
					className="w-full sm:w-40"
					onChange={onEmailMode}
				/>
			)}
			<Select
				value={value === null ? OFF : String(value)}
				onValueChange={(next) => onChange(next === OFF ? null : Number(next))}
				disabled={disabled}
			>
				<SelectTrigger id={triggerId} className="h-8 w-full text-[13px] sm:w-40">
					<SelectValue>{labelOf(value)}</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{choices.map((hours) => (
						<SelectItem key={hours} value={String(hours)} className="text-[13px]">
							{labelOf(hours)}
						</SelectItem>
					))}
					<SelectItem value={OFF} className="text-[13px]">
						{labelOf(null)}
					</SelectItem>
				</SelectContent>
			</Select>
		</SettingsRow>
	);
}
