'use client';
import React, { useEffect } from 'react';
import { useEditor } from '@craftjs/core';
import DragZoneFrame from '../components/drag-zone-frame';
import { previewAtom } from '../components/preview-button';
import { useAtom } from 'jotai';

const Page = () => {
	const { actions } = useEditor((state) => ({
		enabled: state.options.enabled
	}));
	const [preview, setPreview] = useAtom(previewAtom);

	useEffect(() => {
		if (preview) {
			actions.deserialize(preview as any);
			actions.history.clear();
		}
	}, [actions, preview]);

	return (
		<div className="w-[440px]">
			<DragZoneFrame />
		</div>
	);
};

export default Page;
