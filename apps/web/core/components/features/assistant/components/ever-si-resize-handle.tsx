'use client';

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslations } from 'next-intl';
import { EVER_SI_PANEL_ID } from '../atoms/ever-si-panel.atom';
import { EVER_SI_PANEL_WIDTH } from '../ever-si-panel-width';

type EverSiResizeHandleProps = {
	width: number;
	maxWidth: number;
	/** While a drag runs: the width under the pointer, shown but not yet remembered. */
	onPreview: (width: number) => void;
	/** The width to keep, at the end of a drag or on a key press. */
	onCommit: (width: number) => void;
	/** Double-click: back to the standard width. */
	onReset: () => void;
};

type DragState = { startX: number; startWidth: number; direction: number; lastWidth: number };

/** +1 when the panel's free edge is on the right, -1 in a right-to-left layout where it is on the left. */
function growDirectionOf(element: HTMLElement) {
	if (getComputedStyle(element).direction === 'rtl') {
		return -1;
	}
	return 1;
}

function keyStepOf(event: KeyboardEvent<HTMLDivElement>) {
	if (event.shiftKey) {
		return EVER_SI_PANEL_WIDTH.step * 4;
	}
	return EVER_SI_PANEL_WIDTH.step;
}

/** The width a key asks for, or null for a key the separator does not handle. */
function widthForKey(event: KeyboardEvent<HTMLDivElement>, width: number, maxWidth: number) {
	const grow = keyStepOf(event) * growDirectionOf(event.currentTarget);
	switch (event.key) {
		case 'ArrowRight':
			return width + grow;
		case 'ArrowLeft':
			return width - grow;
		case 'Home':
			return EVER_SI_PANEL_WIDTH.min;
		case 'End':
			return maxWidth;
		default:
			return null;
	}
}

/**
 * The edge between the Ever SI panel and the page, a window splitter: drag it, or focus it and use the Arrow keys
 * (Shift for bigger steps, Home and End for the bounds); a double-click brings back the standard width.
 */
export function EverSiResizeHandle({ width, maxWidth, onPreview, onCommit, onReset }: Readonly<EverSiResizeHandleProps>) {
	const t = useTranslations();
	const drag = useRef<DragState | null>(null);
	const label = t('chatView.RESIZE_ASSISTANT');

	const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) {
			return;
		}
		// No text selection and no native drag while the edge moves.
		event.preventDefault();
		event.currentTarget.setPointerCapture?.(event.pointerId);
		drag.current = {
			startX: event.clientX,
			startWidth: width,
			direction: growDirectionOf(event.currentTarget),
			lastWidth: width
		};
	};

	const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
		const current = drag.current;
		if (!current) {
			return;
		}
		current.lastWidth = current.startWidth + (event.clientX - current.startX) * current.direction;
		onPreview(current.lastWidth);
	};

	const endDrag = (event: PointerEvent<HTMLDivElement>) => {
		const current = drag.current;
		if (!current) {
			return;
		}
		drag.current = null;
		event.currentTarget.releasePointerCapture?.(event.pointerId);
		onCommit(current.lastWidth);
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const next = widthForKey(event, width, maxWidth);
		if (next === null) {
			return;
		}
		event.preventDefault();
		onCommit(next);
	};

	return (
		<div
			role="separator"
			tabIndex={0}
			aria-orientation="vertical"
			aria-controls={EVER_SI_PANEL_ID}
			aria-label={label}
			aria-valuenow={width}
			aria-valuemin={EVER_SI_PANEL_WIDTH.min}
			aria-valuemax={maxWidth}
			title={label}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={endDrag}
			onPointerCancel={endDrag}
			onDoubleClick={onReset}
			onKeyDown={handleKeyDown}
			className="group/resize absolute inset-y-2 end-0 z-10 flex w-2 cursor-col-resize touch-none justify-center outline-none"
		>
			{/* The 8px gutter is the grip; a hairline shows in it on hover, and the focus colour for the keyboard. */}
			<span
				aria-hidden="true"
				className="h-full w-px bg-transparent transition-colors group-hover/resize:bg-foreground/15 group-focus-visible/resize:w-0.5 group-focus-visible/resize:bg-ring group-active/resize:bg-foreground/25"
			/>
		</div>
	);
}
