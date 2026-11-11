/** @jest-environment jsdom */
import { act, fireEvent, render, screen, within } from '@testing-library/react';

const mockToast = { success: jest.fn(), warning: jest.fn(), error: jest.fn() };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key
}));
jest.mock('sonner', () => ({
	toast: {
		success: (...args: unknown[]) => mockToast.success(...args),
		warning: (...args: unknown[]) => mockToast.warning(...args),
		error: (...args: unknown[]) => mockToast.error(...args)
	}
}));

import { LabelCatalogDialog } from './label-catalog-dialog';

function renderDialog(onAdd = jest.fn().mockResolvedValue({ added: 1, failed: 0 }), existingNames = ['bug']) {
	const onClose = jest.fn();
	render(<LabelCatalogDialog open existingNames={existingNames} onClose={onClose} onAdd={onAdd} />);
	return { onAdd, onClose };
}

const category = (key: string) => screen.getByTestId(`label-category-${key}`);

describe('LabelCatalogDialog', () => {
	beforeAll(() => {
		// jsdom has no PointerEvent, which Base UI's checkbox dispatches when it is clicked
		if (typeof window.PointerEvent === 'undefined') {
			window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
		}
	});

	beforeEach(() => {
		Object.values(mockToast).forEach((mock) => mock.mockReset());
	});

	it('is named by its title and described by its text', () => {
		renderDialog();

		expect(
			screen.getByRole('dialog', {
				name: 'settings.labelCatalog.TITLE',
				description: 'settings.labelCatalog.DESCRIPTION'
			})
		).toBeTruthy();
	});

	it("lists the catalog by category, and shows the team's labels as added, not to be picked", () => {
		renderDialog();

		expect(within(category('type')).getByText('settings.labelCatalog.categories.TYPE')).toBeTruthy();
		const bug = within(category('type')).getByRole('checkbox', { name: 'Bug' });
		expect(bug.getAttribute('aria-checked')).toBe('true');
		expect(bug.hasAttribute('data-disabled')).toBe(true);
		expect(within(category('type')).getByText('settings.labelCatalog.ADDED')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'settings.labelCatalog.ADD:{"count":0}' })).toHaveProperty(
			'disabled',
			true
		);
	});

	it('narrows the list to the labels and categories a search matches', () => {
		renderDialog();

		fireEvent.change(screen.getByLabelText('settings.labelCatalog.SEARCH'), { target: { value: 'review' } });

		expect(screen.getAllByRole('checkbox').map((box) => box.getAttribute('aria-label'))).toEqual(['Needs Review']);
		fireEvent.change(screen.getByLabelText('settings.labelCatalog.SEARCH'), { target: { value: 'zzz' } });
		expect(screen.getByText('settings.labelCatalog.NO_MATCH')).toBeTruthy();
	});

	it('adds the picked labels with their colours, says so, and closes', async () => {
		const { onAdd, onClose } = renderDialog(jest.fn().mockResolvedValue({ added: 6, failed: 0 }));

		fireEvent.click(within(category('type')).getByRole('checkbox', { name: 'Feature' }));
		fireEvent.click(
			within(category('priority')).getByRole('button', {
				name: 'settings.labelCatalog.SELECT_ALL: settings.labelCatalog.categories.PRIORITY'
			})
		);
		const add = screen.getByRole('button', { name: 'settings.labelCatalog.ADD:{"count":6}' });
		await act(async () => {
			fireEvent.click(add);
		});

		expect(onAdd).toHaveBeenCalledWith([
			{ name: 'Feature', color: '#8957E5' },
			{ name: 'Priority: Critical', color: '#B91C1C' },
			{ name: 'Priority: High', color: '#EF4444' },
			{ name: 'Priority: Medium', color: '#F97316' },
			{ name: 'Priority: Low', color: '#EAB308' },
			{ name: 'Priority: None', color: '#9CA3AF' }
		]);
		expect(mockToast.success).toHaveBeenCalledWith('settings.labelCatalog.ADDED_TOAST:{"count":6}');
		expect(onClose).toHaveBeenCalled();
	});

	it('says how many could not be added, and stays open when the request failed', async () => {
		const partial = renderDialog(jest.fn().mockResolvedValue({ added: 1, failed: 1 }));
		fireEvent.click(within(category('type')).getByRole('checkbox', { name: 'Feature' }));
		fireEvent.click(within(category('type')).getByRole('checkbox', { name: 'Design' }));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.labelCatalog.ADD:{"count":2}' }));
		});
		expect(mockToast.warning).toHaveBeenCalledWith('settings.labelCatalog.PARTIAL_TOAST:{"added":1,"failed":1}');
		expect(partial.onClose).toHaveBeenCalled();
	});

	it('keeps the dialog open with an error when nothing could be added', async () => {
		const failing = renderDialog(jest.fn().mockRejectedValue(new Error('offline')));
		fireEvent.click(within(category('type')).getByRole('checkbox', { name: 'Feature' }));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.labelCatalog.ADD:{"count":1}' }));
		});

		expect(mockToast.error).toHaveBeenCalledWith('settings.labelCatalog.FAILED_TOAST');
		expect(failing.onClose).not.toHaveBeenCalled();
	});
});
