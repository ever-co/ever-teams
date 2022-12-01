import { useEffect, useRef } from 'react';

export function useOutsideClick(
	onClickOuSide?: (el: HTMLElement, nodeTarget: HTMLElement) => void
) {
	const targetEl = useRef<HTMLElement>(null);

	useEffect(() => {
		if (!targetEl.current) return;
		const el = targetEl.current!;
		const onBodyClick = (ev: MouseEvent) => {
			if (!el.contains(ev.target! as Node)) {
				onClickOuSide && onClickOuSide(el, ev.target as HTMLElement);
			}
		};

		document.body.addEventListener('click', onBodyClick);
		return () => {
			document.body.removeEventListener('click', onBodyClick);
		};
	}, []);

	return {
		targetEl,
	};
}
