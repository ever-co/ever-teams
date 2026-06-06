import React from 'react';
import { TeamsModernTimer as MTeams } from '@ever-teams/atoms';
import { useEditor } from '@craftjs/core';
import { atom, useAtom, useSetAtom } from 'jotai';
import { ModernTeamsProps } from './drag-components/_constants/timer';

// Define the drag state type
export type DragState = {
	x: number;
	y: number;
	id: string | null; // Allow id to be a string or null
};

// Atom for drag state
export const dragAtom = atom<DragState>({
	x: 0,
	y: 0,
	id: null
});

// Atom to disable dragging
export const disableDragAtom = atom<boolean>(false);

function DraggableDiv() {
	const [state, setState] = useAtom(dragAtom);
	const setDisableDragAtom = useSetAtom(disableDragAtom);
	const { connectors } = useEditor();

	// Handle drag start event
	// Handle drag start event
	const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
		// Check if currentTarget is null
		if (!event.currentTarget) {
			console.error('Drag event currentTarget is null');
			return; // Exit early if null
		}

		// Ensure the ID is present
		const id = event.currentTarget.id;
		if (!id) {
			console.error('No id found on the currentTarget');
			return; // Exit early if no ID
		}

		console.log('Drag event:', event);
		requestAnimationFrame(() => {
			setState({
				id, // Use the retrieved id
				x: event.clientX,
				y: event.clientY
			});
		});

		const img = new Image();
		img.src =
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgEBAmM+wlwAAAAASUVORK5CYII=';
		event.dataTransfer.setDragImage(img, 0, 0);
	};

	// Handle only drag start event
	const handleOnlyDragStart = (event: React.DragEvent<HTMLDivElement>) => {
		const dragImage = document.createElement('div');
		dragImage.style.width = '0px';
		dragImage.style.height = '0px';
		dragImage.style.opacity = '0';
		document.body.appendChild(dragImage);
		event.dataTransfer.setDragImage(dragImage, 0, 0);

		setTimeout(() => {
			setDisableDragAtom(true);
		}, 300);
	};

	return (
		<>
			<div
				onDragStart={handleOnlyDragStart}
				onDragExit={() => setDisableDragAtom(false)}
				onDragCapture={handleDragStart}
				onDragEnd={() => setDisableDragAtom(false)}
				onDragExitCapture={() => setDisableDragAtom(false)}
				onDragEndCapture={() => setDisableDragAtom(false)}
				ref={(ref: HTMLDivElement | null) => {
					if (ref) {
						connectors.create(ref, <MTeams {...ModernTeamsProps} />);
					}
				}}
				id="mteams"
			>
				<MTeams className="w-fit max-w-[300px]" expandable={true} showProgress={false} />
			</div>
			<div>
				{state.x} + {state.id}
			</div>
		</>
	);
}

export default DraggableDiv;
