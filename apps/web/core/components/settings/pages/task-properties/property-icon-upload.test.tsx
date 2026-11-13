/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { AxiosProgressEvent } from 'axios';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key
}));

const mockUploadImageAsset = jest.fn();
jest.mock('@/core/services/client/api', () => ({
	imageAssetsService: { uploadImageAsset: (...args: unknown[]) => mockUploadImageAsset(...args) }
}));

import { PROPERTY_ICON_MAX_BYTES } from '@/core/lib/utils/property-icon-upload';
import { PropertyIconUpload } from './property-icon-upload';

const ASSET_ID = '5b0f3a52-7c1e-4d6a-9a43-0f1d2e3c4b5a';
const KEY = 'uploads/task_property_icons/e1c2a3b4-5d6e-4f70-8a9b-0c1d2e3f4a5b/image-assets-1731340000-a1b2.png';
const SIGNED_URL = `https://bucket.s3.amazonaws.com/${KEY}?X-Amz-Signature=abc`;

interface UploadCall {
	file: File;
	folder: string;
	signal: AbortSignal;
	onUploadProgress: (progress: Partial<AxiosProgressEvent>) => void;
}

/** An upload the test answers itself, step by step. */
function pendingUpload() {
	let resolve!: (asset: unknown) => void;
	let reject!: (error: unknown) => void;
	mockUploadImageAsset.mockImplementationOnce(
		() =>
			new Promise((onResolve, onReject) => {
				resolve = onResolve;
				reject = onReject;
			})
	);
	const call = () => mockUploadImageAsset.mock.calls[0][0] as UploadCall;
	return { call, resolve: (asset: unknown) => resolve(asset), reject: (error: unknown) => reject(error) };
}

function renderUpload(props: Partial<Parameters<typeof PropertyIconUpload>[0]> = {}) {
	const onPick = jest.fn();
	const view = render(<PropertyIconUpload kind="status" value={null} onPick={onPick} {...props} />);
	return { onPick, ...view };
}

async function choose(file: File) {
	await act(async () => {
		fireEvent.change(screen.getByLabelText('settings.taskProperties.ICON_UPLOAD_CHOOSE'), {
			target: { files: [file] }
		});
	});
}

const png = (size = 2048) => new File([new Uint8Array(size)], 'rocket.png', { type: 'image/png' });

describe('PropertyIconUpload', () => {
	beforeEach(() => {
		mockUploadImageAsset.mockReset();
		URL.createObjectURL = jest.fn(() => 'blob:picked-file');
	});

	it('says which images it takes', () => {
		renderUpload();

		expect(screen.getByText('settings.taskProperties.ICON_UPLOAD_HINT:{"size":1}')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'settings.taskProperties.ICON_UPLOAD_CHOOSE' })).toBeTruthy();
	});

	it('refuses an SVG and an image over the limit, and uploads neither', async () => {
		renderUpload();

		await choose(new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));
		expect(screen.getByRole('alert').textContent).toBe('settings.taskProperties.ICON_UPLOAD_TYPE_ERROR:{"size":1}');

		await choose(png(PROPERTY_ICON_MAX_BYTES + 1));
		expect(screen.getByRole('alert').textContent).toBe('settings.taskProperties.ICON_UPLOAD_SIZE_ERROR:{"size":1}');

		expect(mockUploadImageAsset).not.toHaveBeenCalled();
	});

	it('uploads an image to the property icons, shows how far it went, then picks it', async () => {
		const upload = pendingUpload();
		const { onPick } = renderUpload();
		const file = png();

		await choose(file);

		// By identity: a deep comparison of a jsdom File walks the whole window behind it
		expect(upload.call().file).toBe(file);
		expect(upload.call().folder).toBe('task_property_icons');
		expect(screen.getByRole('progressbar')).toBeTruthy();
		expect(screen.getByText('settings.taskProperties.ICON_UPLOADING')).toBeTruthy();

		act(() => upload.call().onUploadProgress({ loaded: 512, total: 2048 }));

		expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('25');
		expect(screen.getByText('settings.taskProperties.ICON_UPLOADING_PROGRESS:{"progress":25}')).toBeTruthy();
		expect(onPick).not.toHaveBeenCalled();

		await act(async () => upload.resolve({ id: ASSET_ID, url: KEY }));

		expect(onPick).toHaveBeenCalledWith(`image-asset:${ASSET_ID}`);
		expect(screen.queryByRole('progressbar')).toBeNull();
	});

	it('says why an upload failed, and takes another try', async () => {
		const failing = pendingUpload();
		const { onPick } = renderUpload();

		await choose(png());
		await act(async () => failing.reject({ response: { status: 400 } }));

		expect(screen.getByRole('alert').textContent).toBe(
			'settings.taskProperties.ICON_UPLOAD_FAILED:{"reason":"toasts.REASONS.INVALID"}'
		);
		expect(onPick).not.toHaveBeenCalled();

		mockUploadImageAsset.mockResolvedValueOnce({ id: ASSET_ID, url: KEY });
		await choose(png());

		expect(screen.queryByRole('alert')).toBeNull();
		expect(onPick).toHaveBeenCalledWith(`image-asset:${ASSET_ID}`);
	});

	it('shows the image a property has, and offers to replace it', () => {
		const { container } = renderUpload({ value: `image-asset:${ASSET_ID}:S3:${KEY}`, valueUrl: SIGNED_URL });

		expect(container.querySelector('img')?.getAttribute('src')).toBe(SIGNED_URL);
		expect(screen.getByRole('button', { name: 'settings.taskProperties.ICON_UPLOAD_REPLACE' })).toBeTruthy();
	});

	it('cancels an upload still running when the picker closes, and picks nothing', async () => {
		const upload = pendingUpload();
		const { onPick, unmount } = renderUpload();

		await choose(png());
		const { signal } = upload.call();
		unmount();

		expect(signal.aborted).toBe(true);
		await act(async () => upload.resolve({ id: ASSET_ID, url: KEY }));
		expect(onPick).not.toHaveBeenCalled();
	});
});
