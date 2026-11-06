import * as React from 'react';

type RenderElementProps = Record<string, unknown> & {
	children?: React.ReactNode;
	href?: unknown;
	asChild?: boolean;
};

type RenderElement = React.ReactElement<RenderElementProps>;

interface AsChildInput<Render> {
	asChild?: boolean;
	children?: React.ReactNode;
	render?: Render;
}

interface AsChildOutput<Render> {
	render: Render | React.ReactElement | undefined;
	children: React.ReactNode;
	nativeButton: boolean | undefined;
}

type PreventableEvent = React.SyntheticEvent & {
	preventBaseUIHandler?: () => void;
};

function getSingleElementChild(children: React.ReactNode): RenderElement | null {
	if (React.isValidElement<RenderElementProps>(children)) {
		return children;
	}
	if (!Array.isArray(children)) {
		return null;
	}
	const elements = children.filter((child) => React.isValidElement<RenderElementProps>(child));
	if (elements.length !== 1) {
		return null;
	}
	return elements[0] as RenderElement;
}

function withoutChildren(element: RenderElement): React.ReactElement {
	const entries = Object.entries(element.props);
	const entriesWithoutChildren = entries.filter(([propName]) => propName !== 'children');
	const props = Object.fromEntries(entriesWithoutChildren);
	return React.createElement(element.type, props);
}

/**
 * Base UI decides between native and non-native button semantics from `nativeButton`; Radix read the tag
 * at runtime. The tag is known for intrinsic elements, a link is never a button, and a Slot-style `asChild`
 * child is looked through; anything else keeps the primitive's own default.
 */
function inferNativeButton(element: RenderElement): boolean | undefined {
	if (typeof element.type === 'string') {
		return element.type === 'button';
	}
	const hasHref = element.props.href !== undefined;
	if (hasHref) {
		return false;
	}
	const isSlotLike = element.props.asChild === true;
	if (!isSlotLike) {
		return undefined;
	}
	const grandChild = getSingleElementChild(element.props.children);
	if (grandChild === null) {
		return undefined;
	}
	return inferNativeButton(grandChild);
}

/**
 * Radix `asChild` composed through Slot; Base UI composes through `render`. The single child becomes the
 * rendered element (without its children, which Base UI would otherwise drop when merging props) and its
 * children become the primitive's children. An explicit `render` wins over `asChild`.
 */
export function renderFromAsChild<Render>({ asChild, children, render }: AsChildInput<Render>): AsChildOutput<Render> {
	if (render !== undefined) {
		return { render, children, nativeButton: undefined };
	}
	if (asChild !== true) {
		return { render: undefined, children, nativeButton: undefined };
	}
	const child = getSingleElementChild(children);
	if (child === null) {
		return { render: undefined, children, nativeButton: undefined };
	}
	return {
		render: withoutChildren(child),
		children: child.props.children,
		nativeButton: inferNativeButton(child)
	};
}

/**
 * Radix skipped its own handler when a call site called `event.preventDefault()`; Base UI only skips it on
 * `event.preventBaseUIHandler()`. Call this after the call site's handler ran to keep the Radix contract.
 */
export function stopBaseUIHandlerWhenDefaultPrevented(event: PreventableEvent) {
	const isSyntheticDefaultPrevented = event.isDefaultPrevented();
	const isNativeDefaultPrevented = event.nativeEvent.defaultPrevented;
	const isDefaultPrevented = isSyntheticDefaultPrevented || isNativeDefaultPrevented;
	if (!isDefaultPrevented) {
		return;
	}
	event.preventBaseUIHandler?.();
}

type RadixOpenState = 'open' | 'closed';

/** Radix exposed `data-state="open|closed"` on triggers and roots; screens still style through it. */
export function openStateAttribute(isOpen: boolean): RadixOpenState {
	if (isOpen) {
		return 'open';
	}
	return 'closed';
}

/**
 * Mirrors the open state of a Base UI root so the wrapper can hand the Radix `data-state` attribute to its
 * trigger. An `open` prop keeps the root controlled by the call site; otherwise the mirror owns the state.
 */
export function useMirroredOpenState(open: boolean | undefined, defaultOpen: boolean | undefined) {
	const [internalOpen, setInternalOpen] = React.useState(defaultOpen === true);
	const isControlled = open !== undefined;
	let isOpen = internalOpen;
	if (isControlled) {
		isOpen = open;
	}
	const trackOpen = React.useCallback(
		(nextOpen: boolean) => {
			if (isControlled) {
				return;
			}
			setInternalOpen(nextOpen);
		},
		[isControlled]
	);
	return { isOpen, trackOpen };
}

function assignRef<Element>(ref: React.Ref<Element> | undefined, node: Element | null) {
	if (typeof ref === 'function') {
		ref(node);
		return;
	}
	if (ref) {
		ref.current = node;
	}
}

export function composeRefs<Element>(...refs: Array<React.Ref<Element> | undefined>): React.RefCallback<Element> {
	return (node) => {
		for (const ref of refs) {
			assignRef(ref, node);
		}
	};
}
