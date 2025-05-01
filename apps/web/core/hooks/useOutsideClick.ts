'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCallbackRef } from './useCallbackRef';

type Func<T = any> = (el: T, nodeTarget: HTMLElement) => void;

export function useOutsideClick<T extends HTMLElement>(onClickOuSide?: Func) {
	const targetEl = useRef<T>(null);
	const refs = useRef<Node[]>([]);

	const onClickOuSideRef = useCallbackRef(onClickOuSide);

	useEffect(() => {
		const onBodyClick = (ev: MouseEvent) => {
			if (!targetEl.current) return;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const el = targetEl.current!;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

		document.body.addEventListener('click', onBodyClick);
		return () => {
			document.body.removeEventListener('click', onBodyClick);
		};
	}, [onClickOuSideRef]);

	const onOutsideClick = useCallback(
		(func: Func) => {
			onClickOuSideRef.current = func;
		},
		[onClickOuSideRef]
	);

	const ignoreElementRef = useCallback((el: any) => {
		refs.current.push(el);
	}, []);

	return {
		targetEl,
		ignoreElementRef,
		refs,
		onOutsideClick
	};
}
