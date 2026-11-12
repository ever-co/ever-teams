/** @jest-environment jsdom */
/**
 * #5024: an upload still running when the icon picker closes picks nothing. Base UI keeps the popup mounted while it
 * plays its closing transition, so an upload answering then must not change the icon: the popover here keeps its
 * content mounted once the picker has closed, as during that transition.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key
}));

const mockUploadImageAsset = jest.fn();
jest.mock('@/core/services/client/api', () => ({
	imageAssetsService: { uploadImageAsset: (...args: unknown[]) => mockUploadImageAsset(...args) }
}));

jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: ['MEDIA_GALLERY_ADD'] })
}));

jest.mock('@/core/components/common/popover', () => {
	const React = jest.requireActual<typeof import('react')>('react');
	const OpenContext = React.createContext<{ open: boolean; onOpenChange: (open: boolean) => void }>({
		open: false,
		onOpenChange: () => undefined
	});
	return {
		Popover: ({
			open,
			onOpenChange,
			children
		}: {
			open: boolean;
			onOpenChange: (open: boolean) => void;
			children: import('react').ReactNode;
		}) => <OpenContext.Provider value={{ open, onOpenChange }}>{children}</OpenContext.Provider>,
		PopoverTrigger: ({ children }: { children: import('react').ReactElement<{ onClick?: () => void }> }) => {
			const { open, onOpenChange } = React.useContext(OpenContext);
			return React.cloneElement(children, { onClick: () => onOpenChange(!open) });
		},
		// Mounted whether the picker is open or not
		PopoverContent: ({ children }: { children: import('react').ReactNode }) => {
			const { open } = React.useContext(OpenContext);
			return <div data-open={open}>{children}</div>;
		}
	};
});

import { PropertyIconPicker } from './property-icon-picker';

const ASSET_ID = '5b0f3a52-7c1e-4d6a-9a43-0f1d2e3c4b5a';
const ASSET = { id: ASSET_ID, url: 'uploads/task_property_icons/tenant/image-assets-1731340000-a1b2.png' };
const png = () => new File([new Uint8Array(2048)], 'rocket.png', { type: 'image/png' });
const trigger = () => screen.getByRole('button', { name: 'settings.taskProperties.ICON_CHOOSE' });

async function openPickerOnUpload() {
	fireEvent.click(trigger());
	fireEvent.click(await screen.findByRole('tab', { name: 'settings.taskProperties.ICON_TAB_UPLOAD' }));
}

async function chooseImage() {
	await act(async () => {
		fireEvent.change(screen.getByLabelText('settings.taskProperties.ICON_UPLOAD_CHOOSE'), {
			target: { files: [png()] }
		});
	});
}

describe('PropertyIconPicker, an upload and the closing of the picker', () => {
	beforeEach(() => {
		mockUploadImageAsset.mockReset();
	});

	it('picks the image an upload brings while the picker is open', async () => {
		mockUploadImageAsset.mockResolvedValueOnce(ASSET);
		const onChange = jest.fn();
		render(<PropertyIconPicker kind="status" value={null} onChange={onChange} />);

		await openPickerOnUpload();
		await chooseImage();

		expect(onChange).toHaveBeenCalledWith(`image-asset:${ASSET_ID}`);
	});

	it('picks nothing when the picker closed before the upload answered, its popup still mounted', async () => {
		let answer: (asset: unknown) => void = () => undefined;
		mockUploadImageAsset.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
		const onChange = jest.fn();
		render(<PropertyIconPicker kind="status" value={null} onChange={onChange} />);

		await openPickerOnUpload();
		await chooseImage();
		expect(mockUploadImageAsset).toHaveBeenCalledTimes(1);

		fireEvent.click(trigger());
		await act(async () => answer(ASSET));

		expect(onChange).not.toHaveBeenCalled();
	});
});
