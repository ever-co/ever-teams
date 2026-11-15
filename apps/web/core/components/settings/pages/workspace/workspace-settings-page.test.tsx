/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

const mockSaveName = jest.fn(async () => undefined);
const mockSaveCurrency = jest.fn(async () => undefined);
const mockSaveDateFormat = jest.fn(async () => undefined);
const mockSaveNumberFormat = jest.fn(async () => undefined);
const mockSaveWeekStart = jest.fn(async () => undefined);
const mockSaveClock = jest.fn(async () => undefined);
const mockSaveCurrencyPosition = jest.fn(async () => undefined);
const mockSaveDurationRounding = jest.fn(async () => undefined);
const mockSaveDefaultBillRate = jest.fn<Promise<void>, [number | null]>(async () => undefined);
const mockSaveTimeLogsKeepTheirRates = jest.fn(async () => undefined);
const mockRetryLoad = jest.fn();

const ORGANIZATION = { id: 'organization-a', name: 'Acme', currency: 'USD', dateFormat: null, numberFormat: null };

let mockSettings: Record<string, unknown> = {};

function settingsOf(overrides: Record<string, unknown> = {}) {
	return {
		organization: ORGANIZATION,
		name: 'Acme',
		canEdit: true,
		canReadRates: true,
		canRename: true,
		isLoading: false,
		isLoadFailed: false,
		retryLoad: mockRetryLoad,
		saveName: mockSaveName,
		saveCurrency: mockSaveCurrency,
		saveDateFormat: mockSaveDateFormat,
		saveNumberFormat: mockSaveNumberFormat,
		saveWeekStart: mockSaveWeekStart,
		saveClock: mockSaveClock,
		saveCurrencyPosition: mockSaveCurrencyPosition,
		saveDurationRounding: mockSaveDurationRounding,
		saveDefaultBillRate: mockSaveDefaultBillRate,
		saveTimeLogsKeepTheirRates: mockSaveTimeLogsKeepTheirRates,
		...overrides
	};
}

// The Breaks section (#5216) reads the organization through its own hook, which these tests leave out
jest.mock('@/core/hooks/settings/use-organization-tracking-requirements', () => ({
	useOrganizationBreaksSwitch: () => ({ organization: null, saveAllowBreaks: jest.fn() })
}));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useLocale: () => 'en'
}));
jest.mock('@/core/hooks/settings/use-workspace-settings', () => ({
	useWorkspaceSettings: () => mockSettings
}));
// The rate field asks nothing about past time here: the default billing rate prices reports, not entries
jest.mock('@/core/hooks/organizations/rates/use-rate-apply-question', () => ({
	useRateApplyQuestion: () => ({
		rule: null,
		choice: null,
		reset: jest.fn(),
		applyFromOfSave: jest.fn(),
		confirmSaved: jest.fn()
	})
}));
// The rate field's popover always shows its form here, so a test types and saves without a pointer
jest.mock('@/core/components/common/popover', () => ({
	Popover: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	PopoverTrigger: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
		<button type="button" aria-label={String(props['aria-label'] ?? '')}>
			{children}
		</button>
	),
	PopoverContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>
}));
const mockExportAll = jest.fn(async () => undefined);
const NO_EXPORT = { canExport: false, isExporting: false, isFailed: false, exportAll: mockExportAll };
let mockDataExport = NO_EXPORT;
jest.mock('@/core/hooks/settings/use-workspace-data-export', () => ({
	useWorkspaceDataExport: () => mockDataExport
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
const ROUNDING = 'settings.workspace.ROUNDING_LABEL';
const NOT_ROUNDING = { ...ORGANIZATION, durationRoundingInterval: null, durationRoundingDirection: null };
const ROUNDING_UP_15 = { ...ORGANIZATION, durationRoundingInterval: 15, durationRoundingDirection: 'UP' };
const EDIT_NAME = /^settings.common.EDIT_FIELD/;
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
		mockDataExport = NO_EXPORT;
	});

	it('offers the workspace owner to export all data, below the formats', () => {
		mockDataExport = { ...NO_EXPORT, canExport: true };
		render(<WorkspaceSettingsPage />);

		const data = screen.getByRole('heading', { name: 'settings.workspace.DATA_SECTION' });
		const formats = screen.getByRole('heading', { name: 'settings.workspace.FORMATS_SECTION' });
		const dataComesAfterFormats = formats.compareDocumentPosition(data) === Node.DOCUMENT_POSITION_FOLLOWING;
		expect(dataComesAfterFormats).toBe(true);
		fireEvent.click(screen.getByRole('button', { name: 'settings.workspace.EXPORT_ACTION' }));
		expect(mockExportAll).toHaveBeenCalledTimes(1);
	});

	it('shows no Data section to anyone else', () => {
		render(<WorkspaceSettingsPage />);

		expect(screen.queryByRole('heading', { name: 'settings.workspace.DATA_SECTION' })).toBeNull();
		expect(screen.queryByRole('button', { name: 'settings.workspace.EXPORT_ACTION' })).toBeNull();
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
		expect(screen.getAllByTestId('format-select')).toHaveLength(5);
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

	it('shows no duration rounding for a workspace whose API does not store it', () => {
		render(<WorkspaceSettingsPage />);

		expect(screen.queryByText(ROUNDING)).toBeNull();
	});

	it('shows a member the rounding rule as text, with what it does to an entry', () => {
		mockSettings = settingsOf({ canEdit: false, canRename: false, organization: ROUNDING_UP_15 });

		render(<WorkspaceSettingsPage />);
		const roundingRow = rowOf(ROUNDING);

		expect(within(roundingRow).getByText('settings.workspace.ROUNDING_RULE_UP {"minutes":15}')).toBeTruthy();
		expect(
			within(roundingRow).getByText('settings.workspace.ROUNDING_EXAMPLE {"tracked":"1h 7m","rounded":"1h 15m"}')
		).toBeTruthy();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('shows Off and no direction for a workspace that does not round', () => {
		mockSettings = settingsOf({ organization: NOT_ROUNDING });

		render(<WorkspaceSettingsPage />);
		const roundingRow = rowOf(ROUNDING);

		expect(
			within(roundingRow)
				.getAllByTestId('shown-format')
				.map((shown) => shown.textContent)
		).toEqual(['settings.workspace.ROUNDING_OFF']);
		expect(within(roundingRow).queryByText(/ROUNDING_EXAMPLE/)).toBeNull();
	});

	it('turns rounding on at the interval an admin picks, rounding up', async () => {
		mockSettings = settingsOf({ organization: NOT_ROUNDING });
		render(<WorkspaceSettingsPage />);
		const roundingRow = rowOf(ROUNDING);

		await act(async () => {
			fireEvent.click(
				within(roundingRow).getByRole('button', { name: 'settings.workspace.ROUNDING_INTERVAL {"minutes":15}' })
			);
		});

		expect(mockSaveDurationRounding).toHaveBeenCalledWith({ intervalMinutes: 15, direction: 'UP' });
	});

	it('changes the direction of the rule and keeps its interval', async () => {
		mockSettings = settingsOf({ organization: ROUNDING_UP_15 });
		render(<WorkspaceSettingsPage />);
		const roundingRow = rowOf(ROUNDING);

		await act(async () => {
			fireEvent.click(within(roundingRow).getByRole('button', { name: 'settings.workspace.ROUNDING_NEAREST' }));
		});

		expect(mockSaveDurationRounding).toHaveBeenCalledWith({ intervalMinutes: 15, direction: 'NEAREST' });
	});

	it('turns rounding off as no rule', async () => {
		mockSettings = settingsOf({ organization: ROUNDING_UP_15 });
		render(<WorkspaceSettingsPage />);
		const roundingRow = rowOf(ROUNDING);

		await act(async () => {
			fireEvent.click(within(roundingRow).getByRole('button', { name: 'settings.workspace.ROUNDING_OFF' }));
		});

		expect(mockSaveDurationRounding).toHaveBeenCalledWith(null);
	});

	// The translations mock writes a string's values after its key: these strings carry a sample
	const CLOCK_24 = /^settings\.workspace\.CLOCK_24\b/;
	const SYMBOL_AFTER = /^settings\.workspace\.CURRENCY_POSITION_AFTER\b/;

	it('shows a member the week start, the clock and the currency symbol side as text', () => {
		mockSettings = settingsOf({
			canEdit: false,
			organization: { ...ORGANIZATION, startWeekOn: 'SUNDAY', timeFormat: 24, currencyPosition: 'RIGHT' }
		});
		render(<WorkspaceSettingsPage />);

		expect(within(rowOf('settings.workspace.WEEK_START_LABEL')).getByText('Sunday')).toBeTruthy();
		expect(within(rowOf('settings.workspace.CLOCK_LABEL')).getByText(CLOCK_24)).toBeTruthy();
		expect(within(rowOf('settings.workspace.CURRENCY_POSITION_LABEL')).getByText(SYMBOL_AFTER)).toBeTruthy();
	});

	it('saves the week start, the clock and the currency symbol side an admin picks', async () => {
		render(<WorkspaceSettingsPage />);

		await act(async () => {
			fireEvent.click(
				within(rowOf('settings.workspace.WEEK_START_LABEL')).getByRole('button', { name: 'Sunday' })
			);
		});
		await act(async () => {
			fireEvent.click(within(rowOf('settings.workspace.CLOCK_LABEL')).getByRole('button', { name: CLOCK_24 }));
		});
		await act(async () => {
			const sideRow = rowOf('settings.workspace.CURRENCY_POSITION_LABEL');
			fireEvent.click(within(sideRow).getByRole('button', { name: SYMBOL_AFTER }));
		});

		expect(mockSaveWeekStart).toHaveBeenCalledWith('SUNDAY');
		expect(mockSaveClock).toHaveBeenCalledWith(24);
		expect(mockSaveCurrencyPosition).toHaveBeenCalledWith('RIGHT');
	});

	const DEFAULT_RATE = 'settings.workspace.DEFAULT_RATE_LABEL';
	const isPerHourText = (content: string) => content.startsWith('rates.PER_HOUR');

	// The rate field's form names the rate too: the row is found from its own label
	function defaultRateRow(): HTMLElement {
		const rowLabel = screen.getAllByText(DEFAULT_RATE).find((element) => element.tagName === 'SPAN');
		const row = rowLabel?.closest('div[class*="min-h-14"]');
		if (!(row instanceof HTMLElement)) {
			throw new Error('No default billing rate row');
		}
		return row;
	}

	it('shows the default billing rate only to a role that may read rates', () => {
		mockSettings = settingsOf({ canReadRates: false, organization: { ...ORGANIZATION, defaultBillRateValue: 80 } });
		render(<WorkspaceSettingsPage />);

		expect(screen.queryByText(DEFAULT_RATE)).toBeNull();
	});

	it('offers no default billing rate against an API that does not store one', () => {
		render(<WorkspaceSettingsPage />);

		expect(screen.queryByText(DEFAULT_RATE)).toBeNull();
	});

	it('starts the default billing rate empty and saves the rate an admin types', async () => {
		mockSettings = settingsOf({ organization: { ...ORGANIZATION, defaultBillRateValue: null } });
		render(<WorkspaceSettingsPage />);
		const row = defaultRateRow();

		expect(within(row).getByText('rates.ADD_RATE')).toBeTruthy();

		fireEvent.change(within(row).getByRole('textbox'), { target: { value: '80' } });
		await act(async () => {
			fireEvent.click(within(row).getByRole('button', { name: 'common.SAVE' }));
		});

		expect(mockSaveDefaultBillRate.mock.calls[0][0]).toBe(80);
	});

	it('shows a default of zero, which prices nothing, as no default', () => {
		mockSettings = settingsOf({ organization: { ...ORGANIZATION, defaultBillRateValue: 0 } });
		render(<WorkspaceSettingsPage />);

		expect(within(defaultRateRow()).getByText('rates.ADD_RATE')).toBeTruthy();
	});

	it('names the currency a cleared default keeps, which a new rate is priced in', () => {
		const clearedInEuros = { ...ORGANIZATION, defaultBillRateValue: null, defaultBillRateCurrency: 'EUR' };
		mockSettings = settingsOf({ organization: clearedInEuros });
		render(<WorkspaceSettingsPage />);

		expect(within(defaultRateRow()).getByText('EUR')).toBeTruthy();
		expect(within(defaultRateRow()).queryByText('USD')).toBeNull();
	});

	it('shows a member the default billing rate, or that none is set, as text', () => {
		mockSettings = settingsOf({ canEdit: false, organization: { ...ORGANIZATION, defaultBillRateValue: null } });
		const { unmount } = render(<WorkspaceSettingsPage />);

		expect(within(rowOf(DEFAULT_RATE)).getByText('rates.NOT_SET')).toBeTruthy();
		unmount();

		mockSettings = settingsOf({ canEdit: false, organization: { ...ORGANIZATION, defaultBillRateValue: 80 } });
		render(<WorkspaceSettingsPage />);

		expect(within(rowOf(DEFAULT_RATE)).getByText(isPerHourText)).toBeTruthy();
		expect(within(rowOf(DEFAULT_RATE)).queryByRole('textbox')).toBeNull();
	});

	describe('whether past time keeps its rate', () => {
		const KEEP_RATES = 'settings.workspace.KEEP_RATES_LABEL';

		it('is not offered by a Gauzy that does not store rates on time entries', () => {
			render(<WorkspaceSettingsPage />);

			expect(screen.queryByText(KEEP_RATES)).toBeNull();
		});

		it('lets an admin turn it on, off by default', async () => {
			mockSettings = settingsOf({ organization: { ...ORGANIZATION, timeLogsKeepTheirRates: null } });
			render(<WorkspaceSettingsPage />);
			const toggle = screen.getByRole('switch');

			expect(screen.getByText(KEEP_RATES)).toBeTruthy();
			expect(toggle.getAttribute('aria-checked')).toBe('false');

			await act(async () => {
				fireEvent.click(toggle);
			});

			expect(mockSaveTimeLogsKeepTheirRates).toHaveBeenCalledWith(true);
		});

		it('shows a member whether it is on, with nothing to change', () => {
			mockSettings = settingsOf({
				canEdit: false,
				canRename: false,
				organization: { ...ORGANIZATION, timeLogsKeepTheirRates: true }
			});
			render(<WorkspaceSettingsPage />);

			expect(within(rowOf(KEEP_RATES)).getByText('settings.workspace.KEEP_RATES_ON')).toBeTruthy();
			expect(screen.queryByRole('switch')).toBeNull();
		});
	});
});
