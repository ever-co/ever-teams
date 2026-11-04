'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { fetchEditorAssistAvailability } from '@/core/services/client/api/ai/editor-assist.service';

/**
 * Whether the deployment answers AI requests with its own providers. The assistant and the editor's writing help
 * share that answer, so a user only needs a key of their own on a deployment that has none.
 */
export function useServerAiAvailability() {
	const availability = useQuery({
		queryKey: queryKeys.editorAssist.availability,
		queryFn: fetchEditorAssistAvailability,
		staleTime: Infinity
	});
	const hasServerAi = availability.data?.server === true;
	const isChecking = availability.isPending;
	return { hasServerAi, isChecking };
}
