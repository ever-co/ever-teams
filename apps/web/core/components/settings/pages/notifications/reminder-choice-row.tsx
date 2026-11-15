'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { NotificationTypeBadge } from '@/core/components/notifications/notification-type-badge';
import { SettingsRow } from '@/core/components/settings/kit/settings-page';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';
import { EmailModeChoice, EmailModeSelect } from './notification-channel-rows';

const OFF = 'off';

export interface ReminderChoiceRowProps {
	/** The kind the row is about, whose plate leads it. */
	type: EEmployeeNotificationType;
	label: string;
	description: string;
	/** The chosen value (hours, minutes), null for no reminder. */
	value: number | null;
	/** The values offered; one saved elsewhere that the list does not offer is still shown as chosen. */
	choices: readonly number[];
	/** How a value reads in the list, and how "no reminder" (null) does. */
	labelOf: (value: number | null) => string;
	disabled?: boolean;
	onChange: (value: number | null) => void;
	/** How the kind reaches the employee by email, as every other kind's row offers it. */
	emailMode: EmailModeChoice;
	onEmailMode: (mode: EmailModeChoice) => void;
	/** Whether the kind still sends something with no reminder chosen, so its email mode stays offered. */
	isFiledWithoutReminder?: boolean;
}

/**
 * A kind whose reminder comes after or before a chosen time (#5022): off, or one of the choices; and the email mode of
 * the kind, while it sends anything, as each kind's row of the page has it.
 */
export function ReminderChoiceRow({
	type,
	label,
	description,
	value,
	choices,
	labelOf,
	disabled,
	onChange,
	emailMode,
	onEmailMode,
	isFiledWithoutReminder = false
}: Readonly<ReminderChoiceRowProps>) {
	const t = useTranslations();
	const triggerId = useId();
	const shownChoices =
		value === null || choices.includes(value) ? choices : [...choices, value].sort((a, b) => a - b);

	return (
		<SettingsRow
			label={label}
			description={description}
			leading={<NotificationTypeBadge type={type} size="md" />}
			htmlFor={triggerId}
			controlClassName="flex-wrap"
		>
			{(value !== null || isFiledWithoutReminder) && (
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
					{shownChoices.map((choice) => (
						<SelectItem key={choice} value={String(choice)} className="text-[13px]">
							{labelOf(choice)}
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
