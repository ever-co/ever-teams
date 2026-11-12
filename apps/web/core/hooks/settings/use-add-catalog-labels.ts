'use client';

import { useCallback, useState } from 'react';
import { useInvalidateTaskLabels } from '@/core/hooks/tasks/use-invalidate-task-labels';
import { mergeTaskLabelData } from '@/core/lib/helpers/task';
import type { CatalogLabel } from '@/core/lib/utils/task-label-catalog';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { taskLabelService } from '@/core/services/client/api/tasks/task-label.service';
import type { ITagCreate } from '@/core/types/interfaces/tag/tag';

export interface CatalogAddOutcome {
	added: number;
	failed: number;
}

function statusOf(error: unknown): number | null {
	if (ApiErrorService.isApiError(error)) {
		return error.statusCode ?? null;
	}
	const response = (error as { response?: { status?: number } } | null)?.response;
	return response?.status ?? null;
}

/** An API without the bulk route answers 404 (or 405): the labels then go one request each. */
function lacksBulkRoute(error: unknown) {
	const status = statusOf(error);
	return status === 404 || status === 405;
}

/** How many single requests may run at once when the API has no bulk route. */
const FALLBACK_CONCURRENCY = 4;

/** Files the labels in one request, or one by one on an API that has no `POST /tags/bulk`. */
export async function addLabelsInBulk(items: ReadonlyArray<ITagCreate>): Promise<CatalogAddOutcome> {
	try {
		const { data } = await taskLabelService.createTaskLabelsBulk([...items]);
		return { added: data.succeededCount, failed: data.failedCount };
	} catch (error) {
		if (!lacksBulkRoute(error)) {
			throw error;
		}
	}
	let added = 0;
	let failed = 0;
	let next = 0;
	// A few requests at once: the whole catalog, one after another, kept the dialog waiting for 70 round trips
	const fileTheRest = async () => {
		while (next < items.length) {
			const item = items[next];
			next += 1;
			try {
				await taskLabelService.createTaskLabels(item);
				added += 1;
			} catch {
				failed += 1;
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(FALLBACK_CONCURRENCY, items.length) }, fileTheRest));
	return { added, failed };
}

/**
 * Adds labels picked from the catalog as labels of the active team, with their names and colours, then refreshes
 * every list of the team's labels. A label Gauzy refuses (a duplicate, a missing permission) counts as failed.
 */
export function useAddCatalogLabels() {
	const { invalidateTaskLabelsData, teamId, organizationId, tenantId } = useInvalidateTaskLabels();
	const [isAdding, setIsAdding] = useState(false);

	const addLabels = useCallback(
		async (labels: ReadonlyArray<CatalogLabel>): Promise<CatalogAddOutcome> => {
			if (!tenantId || !teamId) {
				throw new Error('Required parameters missing: tenantId, teamId is required');
			}
			const items = labels.map((item) =>
				mergeTaskLabelData({ name: item.name, color: item.color }, undefined, organizationId, tenantId, teamId)
			);
			setIsAdding(true);
			try {
				return await addLabelsInBulk(items);
			} finally {
				setIsAdding(false);
				await invalidateTaskLabelsData();
			}
		},
		[invalidateTaskLabelsData, organizationId, teamId, tenantId]
	);

	return { addLabels, isAdding };
}
