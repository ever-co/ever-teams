'use client';

import { useCallback } from 'react';

interface MetadataQueryState {
	isError: boolean;
	refetch: () => Promise<unknown>;
}

export function useTaskMetadataReadState(
	useBootstrap: boolean,
	bootstrapQuery: MetadataQueryState,
	sectionQuery: MetadataQueryState
) {
	const refetchBootstrap = bootstrapQuery.refetch;
	const refetchSection = sectionQuery.refetch;

	let isError = sectionQuery.isError;
	if (useBootstrap) {
		isError = bootstrapQuery.isError;
	}

	const refetch = useCallback(() => {
		if (useBootstrap) {
			return refetchBootstrap();
		}
		return refetchSection();
	}, [refetchBootstrap, refetchSection, useBootstrap]);

	return { isError, refetch };
}
