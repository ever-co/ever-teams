/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { PropertyIconPanel } from './property-icon-panel';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

jest.mock('@/core/services/client/api', () => ({ imageAssetsService: { uploadImageAsset: jest.fn() } }));

let mockPermissions: string[] = [];
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: mockPermissions })
}));

const buttonNames = () => screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'));

describe('PropertyIconPanel button names', () => {
	beforeEach(() => {
		mockPermissions = [];
	});

	it.each(['status', 'priority', 'size', 'issueType'] as const)(
		'gives every icon of a %s a name of its own',
		(kind) => {
			render(<PropertyIconPanel kind={kind} value={null} onPick={jest.fn()} />);

			const names = buttonNames();
			const repeated = names.filter((name, index) => names.indexOf(name) !== index);

			expect(names.length).toBeGreaterThan(0);
			expect(repeated).toEqual([]);
		}
	);

	it('offers the library only to a user Gauzy does not let upload images', () => {
		mockPermissions = ['ORG_TASK_SETTING'];
		render(
			<PropertyIconPanel
				kind="status"
				value="image-asset:5b0f3a52-7c1e-4d6a-9a43-0f1d2e3c4b5a"
				onPick={jest.fn()}
			/>
		);

		expect(screen.queryByRole('tablist')).toBeNull();
		expect(screen.getByRole('searchbox')).toBeTruthy();
	});

	it('opens on the library, and switches to the upload of an image', () => {
		mockPermissions = ['MEDIA_GALLERY_ADD'];
		render(<PropertyIconPanel kind="status" value="hugeicons:done" onPick={jest.fn()} />);

		expect(
			screen.getByRole('tab', { name: 'settings.taskProperties.ICON_TAB_LIBRARY' }).getAttribute('aria-selected')
		).toBe('true');
		expect(screen.getByRole('searchbox')).toBeTruthy();

		fireEvent.click(screen.getByRole('tab', { name: 'settings.taskProperties.ICON_TAB_UPLOAD' }));

		expect(screen.queryByRole('searchbox')).toBeNull();
		expect(screen.getByRole('button', { name: 'settings.taskProperties.ICON_UPLOAD_CHOOSE' })).toBeTruthy();
	});

	it('opens on the upload of a property whose icon is an uploaded image', () => {
		mockPermissions = ['ALL_ORG_EDIT'];
		render(
			<PropertyIconPanel
				kind="priority"
				value="image-asset:5b0f3a52-7c1e-4d6a-9a43-0f1d2e3c4b5a"
				onPick={jest.fn()}
			/>
		);

		expect(
			screen.getByRole('tab', { name: 'settings.taskProperties.ICON_TAB_UPLOAD' }).getAttribute('aria-selected')
		).toBe('true');
		expect(screen.getByRole('button', { name: 'settings.taskProperties.ICON_UPLOAD_REPLACE' })).toBeTruthy();
	});

	it('names a classic icon with the property it was drawn for, and a library icon by its words', () => {
		render(<PropertyIconPanel kind="status" value={null} onPick={jest.fn()} />);

		expect(screen.getByRole('button', { name: 'medium (taskMenus.fields.size)' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'medium (taskMenus.fields.priority)' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'in progress (taskMenus.fields.status)' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'in progress' })).toBeTruthy();
	});
});
