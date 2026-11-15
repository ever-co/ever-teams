import { teamEmailModeOf, withTeamDefault, withTeamNotificationDefaults } from './team-notification-defaults';

describe('withTeamNotificationDefaults (#5022)', () => {
	const defaults = {
		email: 'digest' as const,
		emailByType: { Mention: 'immediate' as const },
		taskDueReminderHours: 48
	};

	it('fills what the member left unset, and keeps every choice they made, kind by kind', () => {
		expect(
			withTeamNotificationDefaults(
				{ email: 'off', emailByType: { Comment: 'digest' }, taskDueReminderHours: null },
				defaults
			)
		).toEqual({
			email: 'off',
			emailByType: { Mention: 'immediate', Comment: 'digest' },
			taskDueReminderHours: null
		});
	});

	it("is the member's own preferences without team defaults, and the team's for a member with none", () => {
		expect(withTeamNotificationDefaults({ push: false }, null)).toEqual({ push: false });
		expect(withTeamNotificationDefaults(null, defaults)).toEqual(defaults);
	});
});

describe('withTeamDefault', () => {
	it('sets one key and keeps the others', () => {
		expect(withTeamDefault({ push: false }, 'taskDueReminderHours', 4)).toEqual({
			push: false,
			taskDueReminderHours: 4
		});
		expect(withTeamDefault({ push: false }, 'timerReminderHours', null)).toEqual({
			push: false,
			timerReminderHours: null
		});
	});

	it('leaves a key to the members, and is null once none is left', () => {
		expect(withTeamDefault({ push: false, taskUpdate: true }, 'push', undefined)).toEqual({ taskUpdate: true });
		expect(withTeamDefault({ push: false }, 'push', undefined)).toBeNull();
		expect(withTeamDefault(null, 'email', undefined)).toBeNull();
	});
});

describe('teamEmailModeOf', () => {
	it('reads true and false as Gauzy does', () => {
		expect(teamEmailModeOf(true)).toBe('immediate');
		expect(teamEmailModeOf(false)).toBe('off');
		expect(teamEmailModeOf('digest')).toBe('digest');
		expect(teamEmailModeOf(undefined)).toBeUndefined();
	});
});
