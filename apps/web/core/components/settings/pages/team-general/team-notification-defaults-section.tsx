'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import { TASK_DUE_REMINDER_HOUR_CHOICES } from '@/core/lib/notifications/task-due-reminders';
import {
	teamEmailModeOf,
	TTeamDefaultKey,
	TTeamNotificationDefaults,
	withTeamDefault
} from '@/core/lib/notifications/team-notification-defaults';
import { TIMER_REMINDER_HOUR_CHOICES } from '@/core/lib/notifications/timer-reminders';
import type { TOrganizationTeam } from '@/core/types/schemas';

/** "Members choose": the key is left out of the defaults. */
const MEMBERS = 'members';
/** No reminder (`null`). */
const NONE = 'none';

interface Choice {
	value: string;
	label: string;
}

interface DefaultRowProps {
	label: string;
	description: string;
	choices: Choice[];
	/** The stored choice, as one of the choices' values. */
	stored: string;
	canEdit: boolean;
	save: (value: string) => Promise<void>;
}

/** One default: a list of choices for a manager, the chosen one's name for anyone else. */
function DefaultRow({ label, description, choices, stored, canEdit, save }: Readonly<DefaultRowProps>) {
	const triggerId = useId();
	const { value, isPending, change } = useOptimisticSetting<string>(stored, save);
	const chosen = choices.find((choice) => choice.value === value) ?? choices[0];

	if (!canEdit) {
		return (
			<SettingsRow label={label} description={description}>
				<span className="text-[13px] text-foreground">{chosen.label}</span>
			</SettingsRow>
		);
	}
	return (
		<SettingsRow label={label} description={description} htmlFor={triggerId}>
			<Select value={value} onValueChange={(next) => void change(String(next))} disabled={isPending}>
				<SelectTrigger id={triggerId} className="h-8 w-full text-[13px] sm:w-48">
					<SelectValue>{chosen.label}</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{choices.map((choice) => (
						<SelectItem key={choice.value} value={choice.value} className="text-[13px]">
							{choice.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</SettingsRow>
	);
}

/** A threshold as a choice's value: members choose (unset), none (`null`), or the hours. */
function hoursToken(hours: number | null | undefined): string {
	if (hours === undefined) return MEMBERS;
	if (hours === null || hours === 0) return NONE;
	return String(hours);
}

function hoursOfToken(token: string): number | null | undefined {
	if (token === MEMBERS) return undefined;
	if (token === NONE) return null;
	return Number(token);
}

/** The offered thresholds as choices, with a stored one the list does not offer. */
function hourChoices(
	offered: readonly number[],
	stored: number | null | undefined,
	labelOf: (hours: number) => string
) {
	const hours =
		typeof stored === 'number' && stored > 0 && !offered.includes(stored) ? [...offered, stored] : [...offered];
	return hours.sort((a, b) => a - b).map((value) => ({ value: String(value), label: labelOf(value) }));
}

/** A switch as a choice's value: members choose (unset), on or off. */
function switchToken(value: boolean | undefined): string {
	if (value === undefined) return MEMBERS;
	return value ? 'on' : 'off';
}

function switchOfToken(token: string): boolean | undefined {
	if (token === MEMBERS) return undefined;
	return token === 'on';
}

interface TeamNotificationDefaultsSectionProps {
	team: TOrganizationTeam;
	canEdit: boolean;
	saveNotificationDefaults: (defaults: TTeamNotificationDefaults | null) => Promise<void>;
}

/**
 * The team's defaults for its members' notifications (#5022): what a member who chose nothing in their own
 * notification settings gets. Their own choices always win. "Members choose" everywhere, the default, changes nothing.
 */
export function TeamNotificationDefaultsSection({
	team,
	canEdit,
	saveNotificationDefaults
}: Readonly<TeamNotificationDefaultsSectionProps>) {
	const t = useTranslations();
	const defaults = team.notificationDefaults ?? null;
	const membersChoose = { value: MEMBERS, label: t('settings.teamGeneral.MEMBERS_CHOOSE') };
	const onOff = [
		membersChoose,
		{ value: 'on', label: t('settings.teamGeneral.ON') },
		{ value: 'off', label: t('settings.teamGeneral.OFF') }
	];
	// Each save sends the whole defaults with one key changed: the team read last is what the other keys keep
	const save = <K extends TTeamDefaultKey>(key: K, value: TTeamNotificationDefaults[K] | undefined) =>
		saveNotificationDefaults(withTeamDefault(defaults, key, value));

	return (
		<SettingsSection
			id="notification-defaults"
			title={t('settings.teamGeneral.NOTIFICATIONS_SECTION')}
			description={t('settings.teamGeneral.NOTIFICATIONS_DESCRIPTION')}
		>
			<SettingsSurface>
				<DefaultRow
					label={t('notifications.SETTINGS_PAGE.CHANNELS.EMAIL_TITLE')}
					description={t('settings.teamGeneral.EMAIL_DEFAULT_DESCRIPTION')}
					choices={[
						membersChoose,
						{ value: 'immediate', label: t('notifications.SETTINGS_PAGE.CHANNELS.MODE_IMMEDIATE') },
						{ value: 'digest', label: t('notifications.SETTINGS_PAGE.CHANNELS.MODE_DIGEST') },
						{ value: 'off', label: t('notifications.SETTINGS_PAGE.CHANNELS.MODE_OFF') }
					]}
					stored={teamEmailModeOf(defaults?.email) ?? MEMBERS}
					canEdit={canEdit}
					save={(token) =>
						save('email', token === MEMBERS ? undefined : (token as 'immediate' | 'digest' | 'off'))
					}
				/>
				<DefaultRow
					label={t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_TITLE')}
					description={t('settings.teamGeneral.PUSH_DEFAULT_DESCRIPTION')}
					choices={onOff}
					stored={switchToken(defaults?.push)}
					canEdit={canEdit}
					save={(token) => save('push', switchOfToken(token))}
				/>
				<DefaultRow
					label={t('settings.teamGeneral.TASK_UPDATE_DEFAULT_LABEL')}
					description={t('settings.teamGeneral.TASK_UPDATE_DEFAULT_DESCRIPTION')}
					choices={onOff}
					stored={switchToken(defaults?.taskUpdate)}
					canEdit={canEdit}
					save={(token) => save('taskUpdate', switchOfToken(token))}
				/>
				<DefaultRow
					label={t('notifications.SETTINGS_PAGE.TIMER.LABEL')}
					description={t('settings.teamGeneral.TIMER_DEFAULT_DESCRIPTION')}
					choices={[
						membersChoose,
						...hourChoices(TIMER_REMINDER_HOUR_CHOICES, defaults?.timerReminderHours, (hours) =>
							t('notifications.SETTINGS_PAGE.TIMER.AFTER_HOURS', { hours })
						),
						{ value: NONE, label: t('notifications.SETTINGS_PAGE.TIMER.OFF') }
					]}
					stored={hoursToken(defaults?.timerReminderHours)}
					canEdit={canEdit}
					save={(token) => save('timerReminderHours', hoursOfToken(token))}
				/>
				<DefaultRow
					label={t('notifications.SETTINGS_PAGE.TASK_DUE.LABEL')}
					description={t('settings.teamGeneral.TASK_DUE_DEFAULT_DESCRIPTION')}
					choices={[
						membersChoose,
						...hourChoices(TASK_DUE_REMINDER_HOUR_CHOICES, defaults?.taskDueReminderHours, (hours) =>
							t('notifications.SETTINGS_PAGE.TASK_DUE.BEFORE_HOURS', { hours })
						),
						{ value: NONE, label: t('notifications.SETTINGS_PAGE.TASK_DUE.OFF') }
					]}
					stored={hoursToken(defaults?.taskDueReminderHours)}
					canEdit={canEdit}
					save={(token) => save('taskDueReminderHours', hoursOfToken(token))}
				/>
			</SettingsSurface>
		</SettingsSection>
	);
}
