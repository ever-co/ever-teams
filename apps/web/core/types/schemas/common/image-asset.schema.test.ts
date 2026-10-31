/**
 * Regression (#4811): Gauzy stores a null thumb when it cannot build a thumbnail for an upload, and the
 * thumbUrl it computes from it is null too. The image asset schema is strict and the team schema validates
 * `image` with it, so one such team image made the whole `GET /organization-team` response fail validation
 * and Ever Teams listed no team at all.
 */
// Imported from the barrel, as the app does: the zod schema modules import each other in a cycle and the
// barrel sets a working evaluation order.
import { imageAssetSchema, organizationTeamSchema, validatePaginationResponse } from '@/core/types/schemas';

const imageWithThumbnail = {
	id: 'b6a1d2c4-3e5f-4a7b-9c8d-1e2f3a4b5c6d',
	createdAt: '2026-10-20T09:15:00.000Z',
	updatedAt: '2026-10-20T09:15:00.000Z',
	isActive: true,
	isArchived: false,
	archivedAt: null,
	deletedAt: null,
	createdByUserId: null,
	tenantId: 'ec3b6673-d045-4d59-a307-a79521500a81',
	organizationId: '06dea660-2426-4c79-a5aa-05f3434287d9',
	name: 'team-logo.png',
	url: 'file/team-logo.png',
	thumb: 'file/team-logo-thumb.png',
	width: 256,
	height: 256,
	size: 20480,
	isFeatured: false,
	fullUrl: 'https://api.example.com/public/file/team-logo.png',
	thumbUrl: 'https://api.example.com/public/file/team-logo-thumb.png'
};

// What Gauzy sends for an upload it could not build a thumbnail for, such as an older SVG or WebP upload.
const imageWithoutThumbnail = {
	...imageWithThumbnail,
	name: 'team-logo.svg',
	url: 'file/team-logo.svg',
	thumb: null,
	fullUrl: 'https://api.example.com/public/file/team-logo.svg',
	thumbUrl: null
};

const minimalTeam = {
	id: '938816fb-9f91-425a-893a-63468dade965',
	name: 'Design',
	tenantId: 'ec3b6673-d045-4d59-a307-a79521500a81',
	organizationId: '06dea660-2426-4c79-a5aa-05f3434287d9'
};

describe('imageAssetSchema (API response shapes)', () => {
	it('accepts an image Gauzy stored without a thumbnail (null thumb and thumbUrl)', () => {
		const result = imageAssetSchema.safeParse(imageWithoutThumbnail);
		expect(result.success).toBe(true);
	});

	it('accepts null on the other columns Gauzy leaves nullable', () => {
		const imageWithNullColumns = {
			...imageWithoutThumbnail,
			name: null,
			size: null,
			externalProviderId: null,
			storageProvider: null,
			fullUrl: null
		};
		const result = imageAssetSchema.safeParse(imageWithNullColumns);
		expect(result.success).toBe(true);
	});

	it('lists a team whose image has no thumbnail', () => {
		const team = { ...minimalTeam, image: imageWithoutThumbnail };
		const response = { items: [team], total: 1 };
		const validated = validatePaginationResponse(organizationTeamSchema, response, 'getOrganizationTeams');
		expect(validated.items).toHaveLength(1);
	});

	it('still accepts an image with a thumbnail', () => {
		const result = imageAssetSchema.safeParse(imageWithThumbnail);
		expect(result.success).toBe(true);
	});

	it('control: still rejects an image without a url', () => {
		const imageWithoutUrl = { ...imageWithoutThumbnail, url: null };
		const result = imageAssetSchema.safeParse(imageWithoutUrl);
		expect(result.success).toBe(false);
	});
});
