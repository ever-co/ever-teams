/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { useHiddenChatwootBubble } from './use-hidden-chatwoot-bubble';

type WindowWithChatwoot = Window & { $chatwoot?: { toggleBubbleVisibility: jest.Mock } };

function installChatwoot(toggleBubbleVisibility = jest.fn()) {
	(window as WindowWithChatwoot).$chatwoot = { toggleBubbleVisibility };
	return toggleBubbleVisibility;
}

/** The holder Chatwoot draws its bubble in, which the SDK creates a moment after its API. */
function drawBubble() {
	const holder = document.createElement('div');
	holder.className = 'woot--bubble-holder';
	document.body.append(holder);
}

afterEach(() => {
	delete (window as WindowWithChatwoot).$chatwoot;
	document.body.innerHTML = '';
});

describe('the support bubble while Ever SI covers a phone screen', () => {
	it('hides the bubble while asked to, and shows it again after', () => {
		const toggle = installChatwoot();
		drawBubble();
		const { unmount } = renderHook(() => useHiddenChatwootBubble(true));

		expect(toggle).toHaveBeenLastCalledWith('hide');
		unmount();
		expect(toggle).toHaveBeenLastCalledWith('show');
	});

	it('leaves the bubble alone when it is not asked to hide it', () => {
		const toggle = installChatwoot();
		drawBubble();
		renderHook(() => useHiddenChatwootBubble(false));

		expect(toggle).not.toHaveBeenCalled();
	});

	it('waits for the bubble when the API exists before it, then hides it once Chatwoot is ready', () => {
		// As Chatwoot's own toggleBubbleVisibility, which throws while its bubble holder is missing.
		const toggle = installChatwoot(
			jest.fn(() => {
				if (!document.querySelector('.woot--bubble-holder')) {
					throw new TypeError('bubble holder missing');
				}
			})
		);
		const { unmount } = renderHook(() => useHiddenChatwootBubble(true));
		expect(toggle).not.toHaveBeenCalled();

		drawBubble();
		window.dispatchEvent(new Event('chatwoot:ready'));
		expect(toggle).toHaveBeenLastCalledWith('hide');

		expect(() => unmount()).not.toThrow();
		expect(toggle).toHaveBeenLastCalledWith('show');
	});

	it('does not break when Chatwoot itself throws', () => {
		installChatwoot(
			jest.fn(() => {
				throw new Error('chatwoot failed');
			})
		);
		drawBubble();

		expect(() => renderHook(() => useHiddenChatwootBubble(true)).unmount()).not.toThrow();
	});

	it('does nothing on a deployment without Chatwoot', () => {
		expect(() => renderHook(() => useHiddenChatwootBubble(true)).unmount()).not.toThrow();
	});
});
