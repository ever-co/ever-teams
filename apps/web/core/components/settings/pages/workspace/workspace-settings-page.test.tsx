/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

const mockSaveName = jest.fn(async () => undefined);
const mockSaveCurrency = jest.fn(async () => undefined);
const mockSaveDateFormat = jest.fn(async () => undefined);
const mockSaveNumberFormat = jest.fn(async () => undefined);
const mockRetryLoad = jest.fn();

const ORGANIZATION = { id: 'organization-a', name: 'Acme', currency: 'USD', dateFormat: null, numberFormat: null };

let mockSettings: Record<string, unknown> = {};

function settingsOf(overrides: Record<string, unknown> = {}) {
	return {
		organization: ORGANIZATION,
		name: 'Acme',
		canEdit: true,
		canRename: true,
		isLoading: false,
		isLoadFailed: false,
		retryLoad: mockRetryLoad,
		saveName: mockSaveName,
		saveCurrency: mockSaveCurrency,
		saveDateFormat: mockSaveDateFormat,
		saveNumberFormat: mockSaveNumberFormat,
		...overrides
	};
}

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('@/core/hooks/settings/use-workspace-settings', () => ({
	useWorkspaceSettings: () => mockSettings
}));
jest.mock('@/core/components/common/select', () => {
	const { createContext, useContext } = jest.requireActual<typeof React>('react');
	const PickContext = createContext<(value: string) => void>(() => undefined);
	const SelectItem = ({ children, value }: React.PropsWithChildren<{ value: string }>) => {
		const pick = useContext(PickContext);
		return (
			<button type="button" onClick={() => pick(value)}>
				{children}
			</button>
		);
	};
	return {
		Select: ({ children, onValueChange }: React.PropsWithChildren<{ onValueChange: (value: string) => void }>) => (
			<PickContext.Provider value={onValueChange}>{children}</PickContext.Provider>
		),
		SelectTrigger: ({ children, id }: React.PropsWithChildren<{ id: string }>) => (
			<div id={id} data-testid="format-select">
				{children}
			</div>
		),
		SelectValue: ({ children }: React.PropsWithChildren) => <span data-testid="shown-format">{children}</span>,
		SelectContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
		SelectItem
	};
});

import { WorkspaceSettingsPage } from './workspace-settings-page';

const AUTOMATIC = 'settings.workspace.FORMAT_AUTOMATIC';
const EDIT_NAME = 'settings.common.EDIT_FIELD';
const YEAR = new Date().getFullYear();

function rowOf(label: string): HTMLElement {
	const row = screen.getByText(label).closest('div[class*="min-h-14"]');
	if (!(row instanceof HTMLElement)) {
		throw new Error(`No settings row is labelled ${label}`);
	}
	return row;
}

// The notice of a failed read draws its mark through a hook that reads `window.matchMedia`, which jsdom does not provide.
beforeAll(() => {
	window.matchMedia = jest.fn().mockReturnValue({
		matches: false,
		addEventListener: jest.fn(),
		removeEventListener: jest.fn()
	}) as unknown as typeof window.matchMedia;
});

describe('WorkspaceSettingsPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockSettings = settingsOf();
	});

	it('shows its sections loading until the workspace is read', () => {
		mockSettings = settingsOf({ organization: null, isLoading: true });

		render(<WorkspaceSettingsPage />);

		expect(screen.getByText('settings.workspace.FORMATS_SECTION')).toBeTruthy();
		expect(screen.queryByText('settings.workspace.NAME_LABEL')).toBeNull();
		expect(screen.queryByRole('combobox')).toBeNull();
	});

	it('says the settings could not load, with a retry, instead of loading forever', () => {
		mockSettings = settingsOf({ organization: null, isLoadFailed: true });

		render(<WorkspaceSettingsPage />);
		fireEvent.click(screen.getByRole('button', { name: 'notifications.RETRY' }));

		expect(screen.getByText('settings.workspace.LOAD_FAILED')).toBeTruthy();
		expect(mockRetryLoad).toHaveBeenCalled();
	});

	it('shows a member the values as text, with who can change them and nothing to change', () => {
		mockSettings = settingsOf({
			canEdit: false,
			canRename: false,
			organization: { ...ORGANIZATION, currency: 'EUR', dateFormat: 'DD/MM/YYYY', numberFormat: '1.234,56' }
		});

		render(<WorkspaceSettingsPage />);

		expect(screen.getByText('Acme')).toBeTruthy();
		expect(screen.getByText('EUR · Euro')).toBeTruthy();
		expect(screen.getByText(`31/12/${YEAR}`)).toBeTruthy();
		expect(screen.getByText('1.234,56')).toBeTruthy();
		expect(screen.getByText('settings.workspace.NAME_SUPER_ADMIN_ONLY')).toBeTruthy();
		expect(screen.getByText('settings.workspace.READ_ONLY_NOTE')).toBeTruthy();
		expect(screen.queryByRole('button')).toBeNull();
		expect(screen.queryByRole('combobox')).toBeNull();
	});

	it('shows Automatic for a workspace without formats, or with one another app stored', () => {
		mockSettings = settingsOf({
			canEdit: false,
			canRename: false,
			organization: { ...ORGANIZATION, dateFormat: 'LL', numberFormat: 'USD' }
		});

		render(<WorkspaceSettingsPage />);

		expect(screen.getAllByText(AUTOMATIC)).toHaveLength(2);
	});

	it('lets an admin who is not the super admin change the currency and the formats, the name read only', () => {
		mockSettings = settingsOf({ canRename: false });

		render(<WorkspaceSettingsPage />);

		expect(screen.getByText('settings.workspace.NAME_SUPER_ADMIN_ONLY')).toBeTruthy();
		expect(screen.queryByRole('button', { name: EDIT_NAME })).toBeNull();
		expect(screen.getByRole('combobox')).toBeTruthy();
		expect(screen.getAllByTestId('format-select')).toHaveLength(2);
		expect(screen.queryByText('settings.workspace.READ_ONLY_NOTE')).toBeNull();
	});

	it('renames the workspace with the trimmed name', async () => {
		render(<WorkspaceSettingsPage />);

		fireEvent.click(screen.getByRole('button', { name: EDIT_NAME }));
		fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Acme Labs ' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
		});

		expect(mockSaveName).toHaveBeenCalledWith('Acme Labs');
	});

	it('refuses an empty name before saving anything', async () => {
		render(<WorkspaceSettingsPage />);

		fireEvent.click(screen.getByRole('button', { name: EDIT_NAME }));
		fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
		});

		expect(screen.getByRole('alert').textContent).toContain('settings.workspace.NAME_INVALID');
		expect(mockSaveName).not.toHaveBeenCalled();
	});

	it('saves the currency an admin picks', async () => {
		render(<WorkspaceSettingsPage />);

		await act(async () => {
			fireEvent.change(screen.getByRole('combobox'), { target: { value: 'EUR' } });
		});

		expect(mockSaveCurrency).toHaveBeenCalledWith('EUR');
	});

	it('saves the date format an admin picks, and Automatic as no format', async () => {
		mockSettings = settingsOf({ organization: { ...ORGANIZATION, dateFormat: 'MM/DD/YYYY' } });
		render(<WorkspaceSettingsPage />);
		const dateRow = rowOf('settings.workspace.DATE_FORMAT_LABEL');

		await act(async () => {
			fireEvent.click(within(dateRow).getByRole('button', { name: `31/12/${YEAR}` }));
		});
		expect(mockSaveDateFormat).toHaveBeenLastCalledWith('DD/MM/YYYY');

		await act(async () => {
			fireEvent.click(within(dateRow).getByRole('button', { name: AUTOMATIC }));
		});
		expect(mockSaveDateFormat).toHaveBeenLastCalledWith(null);
	});

	it('saves the number format an admin picks', async () => {
		render(<WorkspaceSettingsPage />);
		const numberRow = rowOf('settings.workspace.NUMBER_FORMAT_LABEL');

		await act(async () => {
			fireEvent.click(within(numberRow).getByRole('button', { name: '1.234,56' }));
		});

		expect(mockSaveNumberFormat).toHaveBeenCalledWith('1.234,56');
	});

	it('saves nothing when the format already shown is picked again', async () => {
		mockSettings = settingsOf({ organization: { ...ORGANIZATION, dateFormat: 'LL' } });
		render(<WorkspaceSettingsPage />);
		const dateRow = rowOf('settings.workspace.DATE_FORMAT_LABEL');

		await act(async () => {
			fireEvent.click(within(dateRow).getByRole('button', { name: AUTOMATIC }));
		});

		expect(mockSaveDateFormat).not.toHaveBeenCalled();
	});
});
