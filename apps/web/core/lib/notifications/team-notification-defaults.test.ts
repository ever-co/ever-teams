import {
	teamEmailModeOf,
	teamOfNotificationDefaults,
	withTeamDefault,
	withTeamNotificationDefaults
} from './team-notification-defaults';

describe('withTeamNotificationDefaults (#5022)', () => {
	const defaults = {
		email: 'digest' as const,
		emailByType: { Mention: 'immediate' as const },
		taskDueReminderHours: 48
	};

	it('fills what the member left unset, and keeps every choice they made, kind by kind', () => {
		expect(
			withTeamNotificationDefaults({ emailByType: { Comment: 'digest' }, taskDueReminderHours: null }, defaults)
		).toEqual({
			email: 'digest',
			emailByType: { Mention: 'immediate', Comment: 'digest' },
			taskDueReminderHours: null
		});
	});

	it("keeps a member's mode for every kind over the team's per-kind modes, and their push over the team's", () => {
		// Gauzy reads email off for every kind as the member's choice for each kind they did not set one by one
		expect(withTeamNotificationDefaults({ email: 'off', emailByType: { Comment: 'digest' } }, defaults)).toEqual({
			email: 'off',
			emailByType: { Comment: 'digest' },
			taskDueReminderHours: 48
		});
		expect(withTeamNotificationDefaults({ push: false }, { push: true, pushByType: { Mention: true } })).toEqual({
			push: false
		});
	});

	it("reads the `email: true` Gauzy creates a member's setting with as unset, so the team's mode shows", () => {
		expect(withTeamNotificationDefaults({ email: true }, defaults)).toEqual({
			email: 'digest',
			emailByType: { Mention: 'immediate' },
			taskDueReminderHours: 48
		});
		expect(withTeamNotificationDefaults({ email: false }, defaults).email).toBe(false);
	});

	it("reads a kind the member's map holds as undefined as unset, so the team's mode for it shows", () => {
		expect(withTeamNotificationDefaults({ emailByType: { Mention: undefined } }, defaults).emailByType).toEqual({
			Mention: 'immediate'
		});
		expect(
			withTeamNotificationDefaults({ pushByType: { Mention: undefined } }, { pushByType: { Mention: false } })
				.pushByType
		).toEqual({ Mention: false });
	});

	it("is the member's own preferences without team defaults, and the team's for a member with none", () => {
		expect(withTeamNotificationDefaults({ push: false }, null)).toEqual({ push: false });
		expect(withTeamNotificationDefaults(null, defaults)).toEqual(defaults);
	});
});

describe('teamOfNotificationDefaults', () => {
	const member = (employeeId: string, flags: { isActive?: boolean; isArchived?: boolean } = {}) =>
		({ employeeId, ...flags }) as never;
	const design = { id: 'design', members: [member('me'), member('ann')] };
	const ops = { id: 'ops', members: [member('me')] };
	const sales = { id: 'sales', members: [member('ann')] };

	it('is the team the member works in, as Gauzy reads their last team', () => {
		expect(teamOfNotificationDefaults([design, ops], 'ops', 'me')).toBe(ops);
	});

	it('is their only team while they work in a team they are not a member of, and none among several', () => {
		expect(teamOfNotificationDefaults([design, sales], 'sales', 'me')).toBe(design);
		expect(teamOfNotificationDefaults([design, ops, sales], 'sales', 'me')).toBeNull();
	});

	it('counts neither a membership that ended nor an archived team, nor a user who is no employee', () => {
		const left = { id: 'left', members: [member('me', { isActive: false })] };
		const archived = { id: 'archived', isArchived: true, members: [member('me')] };
		expect(teamOfNotificationDefaults([design, left], 'left', 'me')).toBe(design);
		expect(teamOfNotificationDefaults([design, archived], 'archived', 'me')).toBe(design);
		expect(teamOfNotificationDefaults([design], 'design', undefined)).toBeNull();
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
