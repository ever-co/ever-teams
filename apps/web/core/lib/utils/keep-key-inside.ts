import type { KeyboardEvent } from 'react';

/**
 * Keeps a key for the field that handled it. Base UI's dialogs and popovers also listen on the document, where
 * React dispatches too: a plain `stopPropagation` does not reach them, so Escape in a field would close the panel
 * around it as well.
 */
export function keepKeyInside(event: KeyboardEvent) {
	event.preventDefault();
	event.stopPropagation();
	event.nativeEvent.stopImmediatePropagation();
}
