/** @jest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock('@/core/components/common/app-dialog', () => ({
	APP_DIALOG_BODY: '',
	APP_DIALOG_FOOTER: '',
	AppDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
		open ? <div role="dialog">{children}</div> : null,
	AppDialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>
}));
// The pickers and selects are the page's own; a plain stand-in keeps the test on the trigger's options.
jest.mock('@/core/components/common/select', () => {
	const Plain = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
	return {
		Select: Plain,
		SelectContent: Plain,
		SelectGroup: Plain,
		SelectItem: Plain,
		SelectTrigger: Plain,
		SelectValue: () => null
	};
});
jest.mock('./automation-pickers', () => ({
	SELECT_CONTENT: '',
	SELECT_TRIGGER: '',
	ChipPicker: () => null,
	OptionSelect: () => null
}));
// A checkbox that is a plain one: a click turns it on or off, as the real one does.
jest.mock('@/core/components/common/checkbox', () => ({
	Checkbox: ({
		checked,
		onCheckedChange,
		'aria-label': label,
		'data-testid': testId
	}: {
		checked?: boolean;
		onCheckedChange?: (next: boolean) => void;
		'aria-label'?: string;
		'data-testid'?: string;
	}) => (
		<input
			type="checkbox"
			aria-label={label}
			data-testid={testId}
			checked={!!checked}
			onChange={(event) => onCheckedChange?.(event.target.checked)}
		/>
	)
}));

import { formFromRule, type TaskAutomationForm } from '@/core/lib/utils/task-automations';
import {
	ETaskAutomationAction,
	ETaskAutomationTrigger,
	type ITaskAutomationRule
} from '@/core/types/interfaces/common/task-automation';
import { AutomationRuleEditor } from './automation-rule-editor';

const lookups = { statuses: [], priorities: [], labels: [], members: [], projects: [], teams: [] } as never;

const ruleOf = (trigger: ITaskAutomationRule['trigger']): ITaskAutomationRule => ({
	id: 'rule-1',
	name: 'A merge closes the task',
	description: null,
	projectId: null,
	organizationTeamId: null,
	isEnabled: true,
	position: 0,
	templateKey: null,
	trigger,
	conditions: [],
	actions: [{ type: ETaskAutomationAction.NOTIFY_ASSIGNEES }]
});

function renderEditor(initial: TaskAutomationForm) {
	const onSave = jest.fn<Promise<void>, [TaskAutomationForm]>(async () => undefined);
	render(
		<AutomationRuleEditor
			open
			mode="edit"
			initial={initial}
			lookups={lookups}
			isSaving={false}
			onClose={jest.fn()}
			onSave={onSave}
		/>
	);
	return { onSave };
}

describe('AutomationRuleEditor, the link-closed trigger', () => {
	it('offers “merged pull requests only”, and saves what the box says', async () => {
		const { onSave } = renderEditor(formFromRule(ruleOf({ type: ETaskAutomationTrigger.LINK_CLOSED })));
		const box = screen.getByTestId('automation-merged-only') as HTMLInputElement;
		expect(box.checked).toBe(false);
		expect(screen.getByText('settings.automations.MERGED_ONLY_HINT')).toBeTruthy();

		fireEvent.click(box);
		expect((screen.getByTestId('automation-merged-only') as HTMLInputElement).checked).toBe(true);
		fireEvent.click(screen.getByRole('button', { name: 'settings.automations.SAVE' }));
		await Promise.resolve();
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ trigger: ETaskAutomationTrigger.LINK_CLOSED, mergedOnly: true })
		);
	});

	it('shows a saved rule’s option checked', () => {
		renderEditor(formFromRule(ruleOf({ type: ETaskAutomationTrigger.LINK_CLOSED, mergedOnly: true })));
		expect((screen.getByTestId('automation-merged-only') as HTMLInputElement).checked).toBe(true);
	});

	it('hides the option for another trigger', () => {
		renderEditor(formFromRule(ruleOf({ type: ETaskAutomationTrigger.TASK_CREATED })));
		expect(screen.queryByTestId('automation-merged-only')).toBeNull();
	});
});
