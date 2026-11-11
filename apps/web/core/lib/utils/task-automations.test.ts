import {
	ETaskAutomationAction,
	ETaskAutomationCondition,
	ETaskAutomationRunOutcome,
	ETaskAutomationStatusCategory,
	ETaskAutomationTrigger,
	type ITaskAutomationRule,
	type ITaskAutomationTemplate
} from '@/core/types/interfaces/common/task-automation';
import {
	actionDraftOf,
	actionInputOf,
	changeValueText,
	conditionDraftOf,
	conditionInputOf,
	emptyTaskAutomationForm,
	formFromRule,
	formFromTemplate,
	moveRuleId,
	outcomeToneOf,
	ruleInputFromForm,
	rulesInOrder,
	sortTaskAutomationRules,
	TASK_AUTOMATION_ACTIONS,
	TASK_AUTOMATION_CONDITIONS,
	validateTaskAutomationForm
} from './task-automations';

const rule = (overrides: Partial<ITaskAutomationRule> = {}): ITaskAutomationRule => ({
	id: 'rule-1',
	name: 'Review gets a label',
	description: null,
	projectId: 'project-1',
	organizationTeamId: null,
	isEnabled: true,
	position: 0,
	templateKey: null,
	trigger: { type: ETaskAutomationTrigger.STATUS_CHANGED, toStatuses: ['ready-for-review'], fromStatuses: [] },
	conditions: [
		{ type: ETaskAutomationCondition.IS_OPEN },
		{ type: ETaskAutomationCondition.TITLE_CONTAINS, text: 'release' }
	],
	actions: [
		{ type: ETaskAutomationAction.ADD_LABELS, tagIds: ['tag-1'] },
		{ type: ETaskAutomationAction.SET_STATUS, status: 'st-progress' }
	],
	...overrides
});

describe('task automations form', () => {
	it('names the value every condition and action asks for', () => {
		expect(TASK_AUTOMATION_CONDITIONS.map(conditionInputOf)).toEqual([
			'statuses',
			'statuses',
			'categories',
			'none',
			'none',
			'priorities',
			'labels',
			'labels',
			'none',
			'none',
			'members',
			'none',
			'none',
			'text'
		]);
		expect(TASK_AUTOMATION_ACTIONS.map(actionInputOf)).toEqual(['status', 'priority', 'members', 'members', 'labels', 'labels', 'message']);
	});

	it('reads a rule into a form and writes it back as it was', () => {
		const form = formFromRule(rule());
		expect(form).toMatchObject({ name: 'Review gets a label', projectId: 'project-1', trigger: ETaskAutomationTrigger.STATUS_CHANGED, toStatuses: ['ready-for-review'] });
		expect(form.actions[1]).toMatchObject({ statusMode: 'status', status: 'st-progress' });
		expect(new Set([...form.conditions, ...form.actions].map((item) => item.key)).size).toBe(4);
		expect(ruleInputFromForm(form)).toEqual({
			name: 'Review gets a label',
			description: null,
			projectId: 'project-1',
			organizationTeamId: null,
			isEnabled: true,
			trigger: { type: ETaskAutomationTrigger.STATUS_CHANGED, toStatuses: ['ready-for-review'], fromStatuses: [] },
			conditions: [
				{ type: ETaskAutomationCondition.IS_OPEN },
				{ type: ETaskAutomationCondition.TITLE_CONTAINS, text: 'release' }
			],
			actions: [
				{ type: ETaskAutomationAction.ADD_LABELS, tagIds: ['tag-1'] },
				{ type: ETaskAutomationAction.SET_STATUS, status: 'st-progress' }
			]
		});
	});

	it('writes for each type only the fields the platform reads', () => {
		const form = emptyTaskAutomationForm();
		form.name = '  Assigned → in progress ';
		form.trigger = ETaskAutomationTrigger.TASK_ASSIGNED;
		form.toStatuses = ['dropped'];
		form.conditions = [{ ...conditionDraftOf({ type: ETaskAutomationCondition.IS_ASSIGNED }), values: ['dropped'], text: 'dropped' }];
		form.actions = [
			{ ...actionDraftOf({ type: ETaskAutomationAction.SET_STATUS, category: ETaskAutomationStatusCategory.IN_PROGRESS }), status: 'dropped', priority: 'dropped' },
			{ ...actionDraftOf({ type: ETaskAutomationAction.NOTIFY_ASSIGNEES }), message: '   ' }
		];
		expect(ruleInputFromForm(form)).toMatchObject({
			name: 'Assigned → in progress',
			trigger: { type: ETaskAutomationTrigger.TASK_ASSIGNED },
			conditions: [{ type: ETaskAutomationCondition.IS_ASSIGNED }],
			actions: [
				{ type: ETaskAutomationAction.SET_STATUS, category: ETaskAutomationStatusCategory.IN_PROGRESS },
				{ type: ETaskAutomationAction.NOTIFY_ASSIGNEES }
			]
		});
	});

	it('makes a template a new rule; one that needs the organization’s values starts off', () => {
		const template: ITaskAutomationTemplate = {
			key: 'status-sets-fields',
			name: 'When the status changes, set the assignee, label or priority',
			description: 'x',
			trigger: { type: ETaskAutomationTrigger.STATUS_CHANGED, toStatuses: [] },
			conditions: [],
			actions: [{ type: ETaskAutomationAction.SET_PRIORITY, priority: 'high' }],
			needsInput: true
		};
		const form = formFromTemplate(template, 'Translated name');
		expect(form).toMatchObject({ name: 'Translated name', isEnabled: false, templateKey: 'status-sets-fields' });
		expect(form.actions[0]).toMatchObject({ type: ETaskAutomationAction.SET_PRIORITY, priority: 'high' });
		expect(formFromTemplate({ ...template, needsInput: false }).isEnabled).toBe(true);
	});

	it('points at what keeps a form from being saved', () => {
		const form = emptyTaskAutomationForm();
		form.conditions = [conditionDraftOf({ type: ETaskAutomationCondition.HAS_LABEL }), conditionDraftOf({ type: ETaskAutomationCondition.TITLE_CONTAINS })];
		form.actions = [
			actionDraftOf({ type: ETaskAutomationAction.SET_STATUS, status: '' }),
			actionDraftOf({ type: ETaskAutomationAction.SET_PRIORITY }),
			actionDraftOf({ type: ETaskAutomationAction.ADD_ASSIGNEES }),
			actionDraftOf({ type: ETaskAutomationAction.SET_ASSIGNEES }),
			actionDraftOf({ type: ETaskAutomationAction.REMOVE_LABELS })
		];
		form.actions[0].statusMode = 'status';
		const codes = validateTaskAutomationForm(form).map((error) => error.code);
		expect(codes).toEqual([
			'NAME_REQUIRED',
			'CONDITION_VALUE_REQUIRED',
			'CONDITION_TEXT_REQUIRED',
			'ACTION_STATUS_REQUIRED',
			'ACTION_PRIORITY_REQUIRED',
			'ACTION_MEMBERS_REQUIRED',
			'ACTION_LABELS_REQUIRED'
		]);
		expect(validateTaskAutomationForm(form)[1].itemKey).toBe(form.conditions[0].key);
		const empty = emptyTaskAutomationForm();
		empty.name = 'x';
		empty.actions = [];
		expect(validateTaskAutomationForm(empty).map((error) => error.code)).toEqual(['ACTION_REQUIRED']);
		const fine = emptyTaskAutomationForm();
		fine.name = 'A rule';
		expect(validateTaskAutomationForm(fine)).toEqual([]);
	});

	it('orders the rules, moves one up or down, and reorders them optimistically', () => {
		const rules = [rule({ id: 'b', position: 1 }), rule({ id: 'a', position: 0 }), rule({ id: 'c', position: 2 })];
		expect(sortTaskAutomationRules(rules).map((one) => one.id)).toEqual(['a', 'b', 'c']);
		expect(moveRuleId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
		expect(moveRuleId(['a', 'b', 'c'], 'c', 1)).toBeNull();
		expect(moveRuleId(['a', 'b', 'c'], 'x', 1)).toBeNull();
		expect(rulesInOrder(rules, ['c', 'a']).map((one) => [one.id, one.position])).toEqual([
			['c', 0],
			['a', 1],
			['b', 2]
		]);
	});

	it('gives each outcome its tone, and a value its name', () => {
		expect(outcomeToneOf(ETaskAutomationRunOutcome.APPLIED)).toBe('success');
		expect(outcomeToneOf(ETaskAutomationRunOutcome.RATE_LIMITED)).toBe('warning');
		expect(outcomeToneOf(ETaskAutomationRunOutcome.FAILED)).toBe('danger');
		expect(outcomeToneOf(ETaskAutomationRunOutcome.NO_CHANGE)).toBe('neutral');
		const names: Record<string, string> = { 'e-1': 'Ada' };
		expect(changeValueText(['e-1', 'e-2'], (id) => names[id])).toBe('Ada, e-2');
		expect(changeValueText(null, () => undefined)).toBe('—');
		expect(changeValueText(3, () => undefined)).toBe('3');
		expect(changeValueText('e-1', (id) => names[id])).toBe('Ada');
	});
});
