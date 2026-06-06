'use client';

import { useEditor } from '@craftjs/core';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect } from 'react';
export const useDeleteAtom = () => {
	const pathName = usePathname();
	const { actions, selected } = useEditor((state, query) => {
		const currentNodeId = query.getEvent('selected').last();
		let selected;

		if (currentNodeId) {
			selected = {
				id: currentNodeId,
				name: state.nodes[currentNodeId].data.name,
				settings: state.nodes[currentNodeId].related && state.nodes[currentNodeId].related.settings,
				isDeletable: query.node(currentNodeId).isDeletable()
			};
		}

		return {
			selected,
			isEnabled: state.options.enabled
		};
	});

	const handleCopyPasteWidge = useCallback(
		async (event: globalThis.KeyboardEvent) => {
			if (event.key === 'Delete') {
				if (selected?.id && selected.id !== 'ROOT') {
					actions.delete(selected?.id);
				}
			}
		},
		[selected?.id, actions]
	);

	useEffect(() => {
		document.addEventListener('keydown', handleCopyPasteWidge);
		return () => {
			document.removeEventListener('keydown', handleCopyPasteWidge);
		};
	}, [handleCopyPasteWidge]);
};
