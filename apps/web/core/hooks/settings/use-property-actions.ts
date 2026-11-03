'use client';

import { useCallback } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import {
	isDraftChanged,
	PropertyDraft,
	PropertyListItem,
	propertyEditBodyOf,
	PropertyLookBody,
	propertyLookBodyOf
} from '@/core/lib/utils/settings-task-properties';

export interface PropertyCreateBody extends PropertyLookBody {
	organizationId?: string;
	tenantId?: string | null;
}

interface PropertyMutations {
	createProperty: (body: PropertyCreateBody) => Promise<unknown>;
	editProperty: (id: string, body: PropertyLookBody) => Promise<unknown>;
	deleteProperty: (id: string) => Promise<unknown>;
}

export function usePropertyActions({ createProperty, editProperty, deleteProperty }: PropertyMutations) {
	const { data: user } = useUserQuery();
	const organizationId = user?.employee?.organizationId;
	const tenantId = user?.tenantId;

	const create = useCallback(
		(draft: PropertyDraft) => {
			const look = propertyLookBodyOf(draft);
			return createProperty({ ...look, organizationId, tenantId });
		},
		[createProperty, organizationId, tenantId]
	);

	const update = useCallback(
		async (item: PropertyListItem, draft: PropertyDraft) => {
			const hasChanges = isDraftChanged(item, draft);
			if (!hasChanges) {
				return;
			}
			const body = propertyEditBodyOf(item, draft);
			await editProperty(item.id, body);
		},
		[editProperty]
	);

	const remove = useCallback((item: PropertyListItem) => deleteProperty(item.id), [deleteProperty]);

	return { create, update, remove };
}
