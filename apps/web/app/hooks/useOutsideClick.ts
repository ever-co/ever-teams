import { useCallback, useEffect, useRef } from 'react';

type Func<T = any> = (el: T, nodeTarget: HTMLElement) => void;

export function useOutsideClick<T extends HTMLElement>(onClickOuSide?: Func) {
	const targetEl = useRef<T>(null);
	const refs = useRef<Node[]>([]);

	const onChangeRef = useRef(onClickOuSide);
	if (onClickOuSide) {
		onChangeRef.current = onClickOuSide;
	}

	const handleChange = useCallback((el: T, nodeTarget: HTMLElement) => {
		onChangeRef.current && onChangeRef?.current(el, nodeTarget);
	}, []);

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
			handleChange && handleChange(el, ev.target as HTMLElement);
		};

		document.body.addEventListener('click', onBodyClick);
		return () => {
			document.body.removeEventListener('click', onBodyClick);
		};
	}, []);

	const onOutsideClick = useCallback((func: Func) => {
		onChangeRef.current = func;
	}, []);

	const ignoreElementRef = useCallback((el: any) => {
		refs.current.push(el);
	}, []);

	return {
		targetEl,
		ignoreElementRef,
		refs,
		onOutsideClick,
	};
}
