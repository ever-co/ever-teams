/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';

type MockButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	loading?: boolean;
	variant?: string;
	size?: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the Button-only props are left off the DOM button
function MockButton({ loading: _loading, variant: _variant, size: _size, ...props }: MockButtonProps) {
	return <button {...props} />;
}

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/icons', () => ({ ChevronDown: () => null, X: () => null }));
jest.mock('@/core/components/common/animated-height', () => ({
	AnimatedHeight: ({ children }: Readonly<{ children: React.ReactNode }>) => <>{children}</>
}));
jest.mock('@/core/components/common/command', () => ({ commandKeycapClass: '' }));
jest.mock('@/core/components/common/dialog', () => ({
	DialogTitle: ({ children }: Readonly<{ children: React.ReactNode }>) => <h2>{children}</h2>,
	DialogDescription: ({ children }: Readonly<{ children: React.ReactNode }>) => <p>{children}</p>
}));
jest.mock('@/core/components/common/button', () => ({ Button: (props: MockButtonProps) => MockButton(props) }));
jest.mock('@/core/components/duplicated-components/_button', () => ({
	Button: (props: MockButtonProps) => MockButton(props)
}));
jest.mock('@/core/components/projects/project-cells', () => ({
	PeopleCell: () => null,
	ProjectDatesCell: () => null,
	ProjectStatusChip: () => null,
	ProjectTile: () => null
}));
jest.mock('@/core/hooks/tasks/use-task-statuses-query', () => ({ useTaskStatusesQuery: () => ({ taskStatuses: [] }) }));
jest.mock('@/core/lib/utils/project-list', () => ({ personFromProjectMember: () => null }));
jest.mock('./project-dialog', () => ({
	PROJECT_DIALOG_FOOTER: 'dialog-footer flex flex-wrap',
	ProjectDialog: ({ open, children }: Readonly<{ open: boolean; children: React.ReactNode }>) => {
		if (!open) {
			return null;
		}
		return <div role="dialog">{children}</div>;
	}
}));

import { ProjectConfirmDialog } from './project-confirm-dialog';

function renderConfirmation(error: string | null) {
	render(
		<ProjectConfirmDialog
			open
			onClose={jest.fn()}
			icon={null}
			title="Save the changes to invoice 42?"
			consequences={[]}
			confirmLabel="Save and send again"
			isPending={false}
			error={error}
			onConfirm={jest.fn()}
			secondaryAction={{ label: 'Save changes', isPending: false, onClick: jest.fn() }}
		/>
	);
	const cancel = screen.getByRole('button', { name: 'common.CANCEL' });
	const footer = cancel.parentElement as HTMLElement;
	return { cancel, footer };
}

describe('the footer of a confirmation', () => {
	it('keeps every row of buttons at its end when they wrap, Cancel never pushing itself there', () => {
		const { cancel, footer } = renderConfirmation(null);

		expect(footer.classList.contains('justify-end')).toBe(true);
		expect(footer.classList.contains('flex-wrap')).toBe(true);
		expect(cancel.classList.contains('ml-auto')).toBe(false);
	});

	it('keeps the buttons at its end under an error that takes a row of its own', () => {
		const { cancel, footer } = renderConfirmation('The changes were not saved.');
		const error = screen.getByRole('alert');

		expect(footer.classList.contains('justify-end')).toBe(true);
		expect(error.classList.contains('mr-auto')).toBe(true);
		expect(cancel.classList.contains('ml-auto')).toBe(false);
	});
});
