import {
	createInputOf,
	defaultGoalPeriodOf,
	draftOfGoal,
	EMPTY_GOAL_DRAFT,
	goalDraftErrorsOf,
	goalGapOf,
	goalShareOf,
	isGoalsUnavailableError,
	mayChangeGoal,
	memberGoalGroupsOf,
	ownProgressOf,
	parseGoalHours,
	progressOfPeriod,
	updateInputOf
} from './time-goals';
import {
	ETimeGoalComparison,
	ETimeGoalPeriod,
	ETimeGoalScope,
	ETimeGoalState,
	type ITimeGoal,
	type ITimeGoalProgress
} from '@/core/types/interfaces/timesheet/time-goal';

const HOUR = 3600;

function goalOf(overrides: Partial<ITimeGoal> = {}): ITimeGoal {
	return {
		id: 'goal-1',
		name: 'Client A',
		comparison: ETimeGoalComparison.AT_LEAST,
		targetHours: 20,
		period: ETimeGoalPeriod.WEEK,
		scope: ETimeGoalScope.EMPLOYEE,
		employeeId: 'marie',
		organizationTeamId: null,
		projects: [],
		organizationContacts: [],
		...overrides
	};
}

function progressOf(goal: ITimeGoal, overrides: Partial<ITimeGoalProgress> = {}): ITimeGoalProgress {
	return {
		goalId: goal.id,
		goal,
		employeeId: 'marie',
		period: goal.period,
		startDate: '2026-11-09',
		endDate: '2026-11-15',
		timeZone: 'Europe/Paris',
		trackedSeconds: 12 * HOUR,
		targetSeconds: goal.targetHours * HOUR,
		state: ETimeGoalState.IN_PROGRESS,
		...overrides
	};
}

describe('goalShareOf and goalGapOf', () => {
	it('reads 12 h of 20 h as 60 % with 8 h to go', () => {
		expect(goalShareOf(12 * HOUR, 20 * HOUR)).toBe(60);
		expect(goalGapOf(12 * HOUR, 20 * HOUR)).toEqual({ kind: 'toGo', seconds: 8 * HOUR });
	});

	it('reads 2 h 30 min against at most 2 h as 30 min over', () => {
		expect(goalGapOf(2.5 * HOUR, 2 * HOUR)).toEqual({ kind: 'over', seconds: 0.5 * HOUR });
	});

	it('reads a target met to the second as reached', () => {
		expect(goalGapOf(2 * HOUR, 2 * HOUR)).toEqual({ kind: 'reached', seconds: 0 });
	});

	it('never divides by an empty target', () => {
		expect(goalShareOf(HOUR, 0)).toBe(0);
	});
});

describe('the period switch', () => {
	const week = progressOf(goalOf());
	const day = progressOf(goalOf({ id: 'goal-2', name: 'Meetings', period: ETimeGoalPeriod.DAY }));

	it('opens on the week when a weekly goal exists, else on the first period that has a goal', () => {
		expect(defaultGoalPeriodOf([day, week])).toBe(ETimeGoalPeriod.WEEK);
		expect(defaultGoalPeriodOf([day])).toBe(ETimeGoalPeriod.DAY);
		expect(defaultGoalPeriodOf([])).toBe(ETimeGoalPeriod.WEEK);
	});

	it('shows the goals of the picked period only', () => {
		expect(progressOfPeriod([day, week], ETimeGoalPeriod.DAY)).toEqual([day]);
	});
});

describe('whose progress', () => {
	const own = progressOf(goalOf());
	const paulGoal = goalOf({ id: 'goal-3', name: 'Support', employeeId: 'paul' });
	const paul = progressOf(paulGoal, { employeeId: 'paul' });
	const anaTeamGoal = progressOf(goalOf({ id: 'goal-4', scope: ETimeGoalScope.TEAM, employeeId: null }), {
		employeeId: 'ana'
	});
	const members = [
		{ employeeId: 'ana', name: 'Ana', imageUrl: null },
		{ employeeId: 'marie', name: 'Marie', imageUrl: null },
		{ employeeId: 'paul', name: 'Paul', imageUrl: null }
	];

	it('keeps the caller’s own rows for her list', () => {
		expect(ownProgressOf([own, paul, anaTeamGoal], 'marie')).toEqual([own]);
	});

	it('groups the other members’ rows by member, by name, the caller left out', () => {
		const groups = memberGoalGroupsOf([paul, own, anaTeamGoal], members, 'marie');

		expect(groups.map((group) => group.person.name)).toEqual(['Ana', 'Paul']);
		expect(groups[1].rows).toEqual([paul]);
	});

	it('names a member the team list does not hold by an empty name rather than dropping her rows', () => {
		const stranger = progressOf(goalOf({ id: 'goal-5' }), { employeeId: 'zoe' });

		const groups = memberGoalGroupsOf([stranger], members, 'marie');

		expect(groups).toHaveLength(1);
		expect(groups[0].person).toEqual({ employeeId: 'zoe', name: '', imageUrl: null });
	});
});

describe('the goal form', () => {
	it('reads hours with a dot or a comma', () => {
		expect(parseGoalHours('7.5')).toBe(7.5);
		expect(parseGoalHours('7,5')).toBe(7.5);
		expect(parseGoalHours(' 20 ')).toBe(20);
		expect(parseGoalHours('')).toBeNull();
		expect(parseGoalHours('abc')).toBeNull();
	});

	it('asks for a name, a positive number of hours the period can hold, and a member when one is picked', () => {
		const draft = {
			...EMPTY_GOAL_DRAFT,
			name: '  ',
			hours: '25',
			period: ETimeGoalPeriod.DAY,
			owner: 'member' as const
		};

		expect(goalDraftErrorsOf(draft)).toEqual({
			name: 'dashboard.goals.form.NAME_REQUIRED',
			hours: 'dashboard.goals.form.HOURS_TOO_MANY',
			member: 'dashboard.goals.form.MEMBER_REQUIRED'
		});
		expect(goalDraftErrorsOf({ ...draft, hours: '0' }).hours).toBe('dashboard.goals.form.HOURS_REQUIRED');
		expect(goalDraftErrorsOf({ ...draft, hours: '1.555' }).hours).toBe('dashboard.goals.form.HOURS_PRECISION');
	});

	it('accepts 168 hours a week, not 169', () => {
		const draft = { ...EMPTY_GOAL_DRAFT, name: 'Week', period: ETimeGoalPeriod.WEEK };

		expect(goalDraftErrorsOf({ ...draft, hours: '168' })).toEqual({});
		expect(goalDraftErrorsOf({ ...draft, hours: '169' }).hours).toBe('dashboard.goals.form.HOURS_TOO_MANY');
	});

	it('creates the caller’s own goal without naming her', () => {
		const draft = {
			...EMPTY_GOAL_DRAFT,
			name: ' Client A ',
			hours: '20',
			clientIds: ['client-a'],
			billableOnly: true
		};

		expect(createInputOf(draft, 'team-1')).toEqual({
			name: 'Client A',
			comparison: ETimeGoalComparison.AT_LEAST,
			targetHours: 20,
			period: ETimeGoalPeriod.WEEK,
			scope: ETimeGoalScope.EMPLOYEE,
			billableOnly: true,
			projectIds: [],
			organizationContactIds: ['client-a']
		});
	});

	it('creates a goal for one member, or for the whole team', () => {
		const draft = { ...EMPTY_GOAL_DRAFT, name: 'Support', hours: '2', comparison: ETimeGoalComparison.AT_MOST };

		const forMember = createInputOf({ ...draft, owner: 'member', memberId: 'paul' }, 'team-1');
		const forTeam = createInputOf({ ...draft, owner: 'team', memberId: 'paul' }, 'team-1');

		expect(forMember).toMatchObject({ scope: ETimeGoalScope.EMPLOYEE, employeeId: 'paul' });
		expect(forMember).not.toHaveProperty('organizationTeamId');
		expect(forTeam).toMatchObject({ scope: ETimeGoalScope.TEAM, organizationTeamId: 'team-1' });
		expect(forTeam).not.toHaveProperty('employeeId');
	});

	it('opens a goal in the form as it is, and sends back what may change', () => {
		const goal = goalOf({
			billableOnly: true,
			targetHours: 7.5,
			projects: [{ id: 'project-1', name: 'Website' }],
			organizationContacts: [{ id: 'client-a', name: 'Client A' }]
		});

		const draft = draftOfGoal(goal);

		expect(draft).toMatchObject({
			name: 'Client A',
			hours: '7.5',
			projectIds: ['project-1'],
			clientIds: ['client-a']
		});
		expect(updateInputOf({ ...draft, hours: '15' })).toEqual({
			name: 'Client A',
			comparison: ETimeGoalComparison.AT_LEAST,
			targetHours: 15,
			period: ETimeGoalPeriod.WEEK,
			billableOnly: true,
			projectIds: ['project-1'],
			organizationContactIds: ['client-a']
		});
	});
});

describe('mayChangeGoal', () => {
	const member = { employeeId: 'marie', managedTeamId: null, managedMemberIds: [], actsForEveryone: false };
	const manager = { employeeId: 'lea', managedTeamId: 'team-1', managedMemberIds: ['marie'], actsForEveryone: false };

	it('lets a member change her own goals only', () => {
		expect(mayChangeGoal(goalOf(), member)).toBe(true);
		expect(mayChangeGoal(goalOf({ employeeId: 'paul' }), member)).toBe(false);
		expect(mayChangeGoal(goalOf({ scope: ETimeGoalScope.TEAM, organizationTeamId: 'team-1' }), member)).toBe(false);
	});

	it('lets a manager change the goals of her members and of her team', () => {
		expect(mayChangeGoal(goalOf(), manager)).toBe(true);
		expect(mayChangeGoal(goalOf({ scope: ETimeGoalScope.TEAM, organizationTeamId: 'team-1' }), manager)).toBe(true);
		expect(mayChangeGoal(goalOf({ scope: ETimeGoalScope.ORGANIZATION, employeeId: null }), manager)).toBe(false);
	});

	it('lets someone who acts for everyone change any goal', () => {
		const admin = { ...member, actsForEveryone: true };

		expect(mayChangeGoal(goalOf({ scope: ETimeGoalScope.ORGANIZATION, employeeId: null }), admin)).toBe(true);
	});
});

describe('isGoalsUnavailableError', () => {
	it('reads a platform without goals (404) as unavailable, and nothing else', () => {
		expect(isGoalsUnavailableError({ response: { status: 404 } })).toBe(true);
		expect(isGoalsUnavailableError({ statusCode: 404 })).toBe(true);
		expect(isGoalsUnavailableError({ response: { status: 500 } })).toBe(false);
		expect(isGoalsUnavailableError(new Error('offline'))).toBe(false);
	});
});
