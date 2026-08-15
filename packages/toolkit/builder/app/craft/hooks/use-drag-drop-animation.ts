import { useAtom, useSetAtom } from 'jotai';
import { disableDragAtom, dragAtom } from '../components/atom-animations';

export function useDragDropAnimation() {
	const [state, setState] = useAtom(dragAtom);
	const setDisableDragAtom = useSetAtom(disableDragAtom);
	// Handle drag start event
	const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
		// Check if currentTarget is null
		if (!event.currentTarget) {
			// console.error('Drag event currentTarget is null');
			return; // Exit early if null
		}

		// Ensure the ID is present
		const id = event.currentTarget.id;
		if (!id) {
			// console.error('No id found on the currentTarget');
			return; // Exit early if no ID
		}

		// console.log('Drag event:', event);
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
	const handleOnlyDragStart = (event: any) => {
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
	// motion

	return {
		onDragStart: handleOnlyDragStart,
		onDragExit: () => setDisableDragAtom(false),
		onDragCapture: handleDragStart,
		onDragEnd: () => setDisableDragAtom(false),
		onDragExitCapture: () => setDisableDragAtom(false),
		onDragEndCapture: () => setDisableDragAtom(false)
	};
}
