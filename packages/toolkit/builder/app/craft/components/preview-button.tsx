import { Button } from '@/components/ui/button';
import { useEditor } from '@craftjs/core';
import React from 'react';
import { atom } from "jotai";
import { cn } from '@/lib/utils';
import { ToggleSvgIcon } from './toggle-svg-icon';

export const previewAtom = atom(null);
const PreviewButton = () => {
	const { enabled, actions } = useEditor((state, query) => ({
		enabled: state.options.enabled,
		canUndo: query.history.canUndo(),
		canRedo: query.history.canRedo(),
	}));
	return (
		<div>
			<Button
				type='button'
				className={cn([
					'transition dark:bg-indigo-800 dark:text-slate-100 hover:dark:bg-indigo-800  cursor-pointer w-52 rounded-md text-white  hover:bg-indigo-800 gap-2',
					{
						'bg-indigo-800': enabled,
						'bg-primary': !enabled,
					},])}
				onClick={() => {
					actions.setOptions((options) => (options.enabled = !enabled));
				}}>
				<ToggleSvgIcon isFirstIcon={enabled} />
				{enabled ? 'Finish Editing' : 'Edit'}
			</Button>
		</div>
	);
};

export default PreviewButton;
