'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCallbackRef } from './use-callback-ref';

type Func<T = any> = (el: T, nodeTarget: HTMLElement) => void;
type BodyClickHandler = (ev: MouseEvent) => void;

// All instances share one body listener: a team list mounts several of these hooks for every member row.
const bodyClickHandlers = new Set<BodyClickHandler>();

function dispatchBodyClick(ev: MouseEvent) {
	// Snapshot like the DOM does for separate listeners: a handler added during this click waits for the next one,
	// a handler removed during it is skipped.
	for (const handler of Array.from(bodyClickHandlers)) {
		if (bodyClickHandlers.has(handler)) handler(ev);
	}
}

function subscribeBodyClick(handler: BodyClickHandler) {
	if (bodyClickHandlers.size === 0) document.body.addEventListener('click', dispatchBodyClick);
	bodyClickHandlers.add(handler);

	return () => {
		bodyClickHandlers.delete(handler);
		if (bodyClickHandlers.size === 0) document.body.removeEventListener('click', dispatchBodyClick);
	};
}

export function useOutsideClick<T extends HTMLElement>(onClickOuSide?: Func) {
	const targetEl = useRef<T>(null);
	const refs = useRef<Node[]>([]);

	const onClickOuSideRef = useCallbackRef(onClickOuSide);

	useEffect(() => {
		const onBodyClick = (ev: MouseEvent) => {
			if (!targetEl.current) return;
			const el = targetEl.current!;
			const tnode = ev.target! as Node;

			if (
				el.contains(tnode) ||
				refs.current.some((ref) => {
					return (ref && ref.isSameNode(tnode)) || (ref && ref.contains(tnode));
				})
			) {
				return;
			}
			onClickOuSideRef.current && onClickOuSideRef.current(el, ev.target as HTMLElement);
		};

		return subscribeBodyClick(onBodyClick);
	}, [onClickOuSideRef]);

	const onOutsideClick = useCallback(
		(func: Func) => {
			onClickOuSideRef.current = func;
		},
		[onClickOuSideRef]
	);

	// Callers wrap this in mergeRefs() during render, so React calls it with null then the node on every
	// render: keep each node once or the list grows for as long as the component lives.
	const ignoreElementRef = useCallback((el: any) => {
		if (el && !refs.current.includes(el)) refs.current.push(el);
	}, []);

	return {
		targetEl,
		ignoreElementRef,
		refs,
		onOutsideClick
	};
}
