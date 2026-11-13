/** @jest-environment jsdom */

import { useRef } from 'react';
import { render } from '@testing-library/react';
import { useActiveItemInView } from './use-active-item-in-view';

const TABS = ['all', 'tasks', 'goTo'];

function rectAt(left: number, width: number): DOMRect {
	return { left, width, right: left + width, top: 0, bottom: 40, height: 40, x: left, y: 0, toJSON: () => ({}) };
}

/** A phone-wide strip of three tabs whose last one sits beyond the right edge. */
function Strip({ active }: Readonly<{ active: string }>) {
	const activeRef = useRef<HTMLButtonElement>(null);
	const stripRef = useActiveItemInView<HTMLDivElement, HTMLButtonElement>(activeRef, active);
	return (
		<div ref={stripRef} data-testid="strip">
			{TABS.map((tab) => {
				let ref: typeof activeRef | null = null;
				if (tab === active) {
					ref = activeRef;
				}
				return (
					<button key={tab} ref={ref} data-tab={tab} type="button">
						{tab}
					</button>
				);
			})}
		</div>
	);
}

const tabLefts: Record<string, number> = { all: 28, tasks: 120, goTo: 420 };

function layOut(strip: HTMLElement, scrollWidth: number) {
	Object.defineProperty(strip, 'clientWidth', { configurable: true, value: 343 });
	Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: scrollWidth });
	strip.getBoundingClientRect = () => rectAt(16, 343);
	strip.scrollTo = jest.fn() as unknown as typeof strip.scrollTo;
	for (const tab of Array.from(strip.querySelectorAll<HTMLElement>('[data-tab]'))) {
		const left = tabLefts[tab.dataset.tab ?? 'all'];
		tab.getBoundingClientRect = () => rectAt(left, 60);
	}
}

describe('useActiveItemInView', () => {
	it('scrolls a tab picked beyond the edge into the middle of the strip', () => {
		const view = render(<Strip active="all" />);
		const strip = view.getByTestId('strip');
		layOut(strip, 520);
		view.rerender(<Strip active="goTo" />);
		expect(strip.scrollTo).toHaveBeenCalledWith({ left: 262.5, behavior: 'auto' });
	});

	it('leaves a strip that shows every tab alone', () => {
		const view = render(<Strip active="all" />);
		const strip = view.getByTestId('strip');
		layOut(strip, 343);
		view.rerender(<Strip active="goTo" />);
		expect(strip.scrollTo).not.toHaveBeenCalled();
	});
});
