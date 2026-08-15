import { useIsPreviewing } from '@builder.io/react';

export const useBuilderPreview = () => {
	const isPreviewing = useIsPreviewing();

	const isInBuilder =
		typeof window !== 'undefined' &&
		(window.location.search.includes('builder.preview=') ||
			window.location.search.includes('builder.frameEditing='));

	return {
		isPreviewMode: isPreviewing || isInBuilder
	};
};
