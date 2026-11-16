'use client';

import { useId, useRef } from 'react';
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
	hours.sort((a, b) => a - b);
	return hours.map((value) => ({ value: String(value), label: labelOf(value) }));
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

/** When the team was last changed, as read, in milliseconds; NaN when the read does not say. */
function changedAtOf(team: TOrganizationTeam): number {
	return team.updatedAt ? new Date(team.updatedAt).getTime() : Number.NaN;
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
	// Each save sends the whole defaults: every change joins them at once, so a change made before an earlier one's save
	// answers builds on it. The saves run one at a time, each sending the defaults as they are when its turn comes, so a
	// request that reaches Gauzy late never writes older defaults over newer ones. A refused change is taken back out, so
	// the next save does not send it again. The team read again replaces the defaults at once when no save is waiting or
	// on its way, else once the last of them answers (a read that lands before a later save is older than it), and never
	// with a read of the team older than one already seen (a team list fetched before the last save, landing after it).
	const latest = useRef<{
		read: TTeamNotificationDefaults | null;
		readChangedAt: number;
		next: TTeamNotificationDefaults | null;
		pending: number;
		/**
		 * Whether a read landed while the last save sent was on its way: it may hold a change made after that save, so it
		 * replaces the defaults once the saves answer. A read that landed before the last save was sent is older than it.
		 */
		readWhileSaving: boolean;
		queue: Promise<void>;
	}>({
		read: defaults,
		readChangedAt: Number.NEGATIVE_INFINITY,
		next: defaults,
		pending: 0,
		readWhileSaving: false,
		queue: Promise.resolve()
	});
	// The newest time a read said the team changed advances with every newer read, the defaults the same or not. A read
	// that says no time cannot be ordered: it is taken, and leaves that time as it is.
	const changedAt = changedAtOf(team);
	const hasChangedAt = !Number.isNaN(changedAt);
	const isOlderRead = hasChangedAt && changedAt < latest.current.readChangedAt;
	if (!isOlderRead) {
		if (hasChangedAt) latest.current.readChangedAt = changedAt;
		if (latest.current.read !== defaults) {
			latest.current.read = defaults;
			if (latest.current.pending === 0) {
				latest.current.next = defaults;
			} else {
				latest.current.readWhileSaving = true;
			}
		}
	}
	const shown = latest.current.read;
	const save = <K extends TTeamDefaultKey>(key: K, value: TTeamNotificationDefaults[K] | undefined) => {
		latest.current.next = withTeamDefault(latest.current.next, key, value);
		latest.current.pending += 1;
		const turn = latest.current.queue.then(async () => {
			latest.current.readWhileSaving = false;
			try {
				await saveNotificationDefaults(latest.current.next);
			} catch (error) {
				latest.current.next = withTeamDefault(latest.current.next, key, latest.current.read?.[key]);
				throw error;
			} finally {
				latest.current.pending -= 1;
				if (latest.current.pending === 0 && latest.current.readWhileSaving) {
					latest.current.next = latest.current.read;
					latest.current.readWhileSaving = false;
				}
			}
		});
		latest.current.queue = turn.catch(() => undefined);
		return turn;
	};

	// A Gauzy that keeps no team defaults reads a team without the key (one that keeps them reads it as null): the
	// section would offer choices it drops without a word
	if (team.notificationDefaults === undefined) return null;

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
					stored={teamEmailModeOf(shown?.email) ?? MEMBERS}
					canEdit={canEdit}
					save={(token) =>
						save('email', token === MEMBERS ? undefined : (token as 'immediate' | 'digest' | 'off'))
					}
				/>
				<DefaultRow
					label={t('notifications.SETTINGS_PAGE.CHANNELS.PUSH_TITLE')}
					description={t('settings.teamGeneral.PUSH_DEFAULT_DESCRIPTION')}
					choices={onOff}
					stored={switchToken(shown?.push)}
					canEdit={canEdit}
					save={(token) => save('push', switchOfToken(token))}
				/>
				<DefaultRow
					label={t('settings.teamGeneral.TASK_UPDATE_DEFAULT_LABEL')}
					description={t('settings.teamGeneral.TASK_UPDATE_DEFAULT_DESCRIPTION')}
					choices={onOff}
					stored={switchToken(shown?.taskUpdate)}
					canEdit={canEdit}
					save={(token) => save('taskUpdate', switchOfToken(token))}
				/>
				<DefaultRow
					label={t('notifications.SETTINGS_PAGE.TIMER.LABEL')}
					description={t('settings.teamGeneral.TIMER_DEFAULT_DESCRIPTION')}
					choices={[
						membersChoose,
						...hourChoices(TIMER_REMINDER_HOUR_CHOICES, shown?.timerReminderHours, (hours) =>
							t('notifications.SETTINGS_PAGE.TIMER.AFTER_HOURS', { hours })
						),
						{ value: NONE, label: t('notifications.SETTINGS_PAGE.TIMER.OFF') }
					]}
					stored={hoursToken(shown?.timerReminderHours)}
					canEdit={canEdit}
					save={(token) => save('timerReminderHours', hoursOfToken(token))}
				/>
				<DefaultRow
					label={t('notifications.SETTINGS_PAGE.TASK_DUE.LABEL')}
					description={t('settings.teamGeneral.TASK_DUE_DEFAULT_DESCRIPTION')}
					choices={[
						membersChoose,
						...hourChoices(TASK_DUE_REMINDER_HOUR_CHOICES, shown?.taskDueReminderHours, (hours) =>
							t('notifications.SETTINGS_PAGE.TASK_DUE.BEFORE_HOURS', { hours })
						),
						{ value: NONE, label: t('notifications.SETTINGS_PAGE.TASK_DUE.OFF') }
					]}
					stored={hoursToken(shown?.taskDueReminderHours)}
					canEdit={canEdit}
					save={(token) => save('taskDueReminderHours', hoursOfToken(token))}
				/>
			</SettingsSurface>
		</SettingsSection>
	);
}
