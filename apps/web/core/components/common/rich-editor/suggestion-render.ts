import { ReactRenderer } from '@tiptap/react';
import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import {
	SuggestionList,
	type SuggestionEntry,
	type SuggestionListHandle,
	type SuggestionListProps
} from './suggestion-list';
import { RICH_EDITOR_LAYER_ATTRIBUTE } from './editor-layer';

export type SuggestionLabels = {
	emptyLabel: string;
	loadingLabel: string;
	ariaLabel: string;
};

/**
 * A modal dialog (Headless UI or Base UI) treats a press outside its own tree as a dismissal and keeps focus
 * inside it, so a list opened from an editor inside a dialog mounts in that dialog, not on the body.
 */
function popupHostOf(editorElement: HTMLElement): HTMLElement {
	const dialog = editorElement.closest<HTMLElement>('[role="dialog"]');
	return dialog ?? document.body;
}

/**
 * The renderer both suggestion menus share. The plugin's `mount` keeps the list anchored to the caret through
 * scroll and resize; `onOpenChange` lets the editor's own Escape handler step aside while the list is open.
 */
export function suggestionRender<I extends SuggestionEntry>(options: {
	labels: () => SuggestionLabels;
	onOpenChange?: (open: boolean) => void;
}): NonNullable<SuggestionOptions<I, I>['render']> {
	return () => {
		let component: ReactRenderer<SuggestionListHandle, SuggestionListProps<I>> | null = null;
		let unmount: (() => void) | null = null;

		const listProps = (props: SuggestionProps<I, I>): SuggestionListProps<I> => ({
			items: props.items,
			command: props.command,
			loading: props.loading,
			...options.labels()
		});

		return {
			onStart(props) {
				component = new ReactRenderer<SuggestionListHandle, SuggestionListProps<I>>(SuggestionList, {
					props: listProps(props),
					editor: props.editor,
					className: 'absolute top-0 left-0 z-[1000]'
				});
				component.element.setAttribute(RICH_EDITOR_LAYER_ATTRIBUTE, '');
				const host = popupHostOf(props.editor.view.dom);
				host.appendChild(component.element);
				unmount = props.mount(component.element);
				options.onOpenChange?.(true);
			},
			onUpdate(props) {
				component?.updateProps(listProps(props));
			},
			onKeyDown(props) {
				if (props.event.key === 'Escape') {
					return false;
				}
				return component?.ref?.onKeyDown(props.event) ?? false;
			},
			onExit() {
				unmount?.();
				unmount = null;
				component?.element.remove();
				component?.destroy();
				component = null;
				options.onOpenChange?.(false);
			}
		};
	};
}
