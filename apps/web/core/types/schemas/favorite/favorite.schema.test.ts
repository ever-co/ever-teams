/**
 * Regression (#4823): the web reads every favorite of the employee and validates the list as a whole.
 * A favorite saved in Gauzy on a payment, an equipment or a goal, or on an entity type Gauzy adds
 * later, made the whole list fail validation, so no favorite task showed and task stars could not be
 * turned off.
 */
import { randomUUID } from 'node:crypto';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';
// Through the barrel, as the app loads them: the zod schema modules import each other in a cycle, and the barrel
// sets a working evaluation order.
import { favoriteCreateSchema, favoriteSchema, validatePaginationResponse } from '@/core/types/schemas';

const tenantId = 'ec3b6673-d045-4d59-a307-a79521500a81';
const organizationId = '06dea660-2426-4c79-a5aa-05f3434287d9';
const employeeId = '099440e0-ef49-4aae-9e14-3d13f92afdc2';
const taskId = '938816fb-9f91-425a-893a-63468dade965';

function favoriteOn(entity: unknown, entityId: string = randomUUID()) {
	const id = randomUUID();

	return { id, entity, entityId, employeeId, organizationId, tenantId };
}

// Same validation as favoriteService.getFavoritesByEmployee
function readFavorites(items: unknown[]) {
	const response = { items, total: items.length };

	return validatePaginationResponse(favoriteSchema, response, 'getFavoritesByEmployee API response');
}

describe('favoriteSchema (favorites list read)', () => {
	it('accepts favorites saved in Gauzy on a payment, an equipment or a goal and keeps the task favorite', () => {
		const items = [
			favoriteOn(EBaseEntityEnum.Task, taskId),
			favoriteOn('Payment'),
			favoriteOn('Equipment'),
			favoriteOn('Goal')
		];

		const favorites = readFavorites(items);
		const taskFavorites = favorites.items.filter((favorite) => favorite.entity === EBaseEntityEnum.Task);
		const taskFavoriteIds = taskFavorites.map((favorite) => favorite.entityId);

		expect(favorites.items).toHaveLength(4);
		expect(taskFavoriteIds).toEqual([taskId]);
	});

	it('accepts an entity type Gauzy adds later without failing the whole list', () => {
		const taskFavorite = favoriteOn(EBaseEntityEnum.Task, taskId);
		const laterTypeFavorite = favoriteOn('EntityAddedLater');

		const favorites = readFavorites([taskFavorite, laterTypeFavorite]);

		expect(favorites.items).toHaveLength(2);
	});

	it('control: still rejects a favorite whose entity is not a string', () => {
		const favorite = favoriteOn(42);

		const result = favoriteSchema.safeParse(favorite);

		expect(result.success).toBe(false);
	});
});

describe('favoriteCreateSchema (create request)', () => {
	it('control: still accepts a task favorite and rejects an entity type Gauzy does not have', () => {
		const taskPayload = { entity: EBaseEntityEnum.Task, entityId: taskId };
		const unknownPayload = { entity: 'EntityAddedLater', entityId: taskId };

		const taskResult = favoriteCreateSchema.safeParse(taskPayload);
		const unknownResult = favoriteCreateSchema.safeParse(unknownPayload);

		expect(taskResult.success).toBe(true);
		expect(unknownResult.success).toBe(false);
	});
});
