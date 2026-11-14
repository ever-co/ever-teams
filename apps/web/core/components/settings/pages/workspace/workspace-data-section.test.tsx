/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

import { WorkspaceDataSection } from './workspace-data-section';

function renderSection(props: Partial<React.ComponentProps<typeof WorkspaceDataSection>> = {}) {
	const onExport = jest.fn();
	render(<WorkspaceDataSection isExporting={false} isFailed={false} onExport={onExport} {...props} />);
	return { onExport };
}

// The notice of a failed export draws its mark through a hook that reads `window.matchMedia`, which jsdom lacks.
beforeAll(() => {
	window.matchMedia = jest.fn().mockReturnValue({
		matches: false,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn()
	}) as unknown as typeof window.matchMedia;
});

describe('WorkspaceDataSection', () => {
	it('offers to export all data and says what the archive holds', () => {
		const { onExport } = renderSection();

		expect(screen.getByRole('heading', { name: 'settings.workspace.DATA_SECTION' })).toBeTruthy();
		expect(screen.getByText('settings.workspace.EXPORT_LABEL')).toBeTruthy();
		expect(screen.getByText('settings.workspace.EXPORT_DESCRIPTION')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'settings.workspace.EXPORT_ACTION' }));
		expect(onExport).toHaveBeenCalledTimes(1);
	});

	it('says it is working, and takes no second click, while the archive is prepared', () => {
		const { onExport } = renderSection({ isExporting: true });

		const button = screen.getByRole('button', { name: 'settings.workspace.EXPORTING' }) as HTMLButtonElement;
		expect(button.disabled).toBe(true);
		expect(button.getAttribute('aria-busy')).toBe('true');
		fireEvent.click(button);
		expect(onExport).not.toHaveBeenCalled();
	});

	it('says the export failed and offers to try again', () => {
		const { onExport } = renderSection({ isFailed: true });

		expect(screen.getByText('settings.workspace.EXPORT_FAILED')).toBeTruthy();
		expect(screen.getByText('settings.workspace.EXPORT_FAILED_DESCRIPTION')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'notifications.RETRY' }));
		expect(onExport).toHaveBeenCalledTimes(1);
	});

	it('shows no failure while a new try runs', () => {
		renderSection({ isFailed: false, isExporting: true });

		expect(screen.queryByText('settings.workspace.EXPORT_FAILED')).toBeNull();
	});
});
