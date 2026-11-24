/**
 * @jest-environment node
 */
/**
 * POST /api/image-assets/upload/:folder (#5726): a refusal of the API left the handler as an unhandled rejection, and the
 * browser got an empty 500 that the app read as "Try again in a moment".
 */
const mockAuthenticatedGuard = jest.fn();
const mockPOST = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/image-assets', () => ({
	createImageAssetsRequest: (...args: unknown[]) => mockPOST(...args)
}));

import { POST } from './route';
import { describeRefusalsPassedOn } from '@/test/api/refusals-passed-on';

const ROUTE = 'https://app.example.com/api/image-assets/upload/profile_pictures_avatars';
const params = { params: Promise.resolve({ folder: 'profile_pictures_avatars' }) };

function upload() {
	const form = new FormData();
	form.append('file', new Blob(['image']), 'avatar.png');
	const request = new Request(ROUTE, { method: 'POST', headers: { origin: new URL(ROUTE).origin }, body: form });
	return POST(request, params) as Promise<Response>;
}

describeRefusalsPassedOn('POST /api/image-assets/upload/:folder', mockAuthenticatedGuard, [
	['an upload', upload, mockPOST]
]);
