/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react';
import { useHiddenChatwootBubble } from './use-hidden-chatwoot-bubble';

type WindowWithChatwoot = Window & { $chatwoot?: { toggleBubbleVisibility: jest.Mock } };

function installChatwoot() {
	const toggleBubbleVisibility = jest.fn();
	(window as WindowWithChatwoot).$chatwoot = { toggleBubbleVisibility };
	return toggleBubbleVisibility;
}

afterEach(() => {
	delete (window as WindowWithChatwoot).$chatwoot;
});

describe('the support bubble while Ever SI covers a phone screen', () => {
	it('hides the bubble while asked to, and shows it again after', () => {
		const toggle = installChatwoot();
		const { unmount } = renderHook(() => useHiddenChatwootBubble(true));

		expect(toggle).toHaveBeenLastCalledWith('hide');
		unmount();
		expect(toggle).toHaveBeenLastCalledWith('show');
	});

	it('leaves the bubble alone when it is not asked to hide it', () => {
		const toggle = installChatwoot();
		renderHook(() => useHiddenChatwootBubble(false));

		expect(toggle).not.toHaveBeenCalled();
	});

	it('hides the bubble once Chatwoot finishes loading', () => {
		renderHook(() => useHiddenChatwootBubble(true));
		const toggle = installChatwoot();

		window.dispatchEvent(new Event('chatwoot:ready'));

		expect(toggle).toHaveBeenCalledWith('hide');
	});

	it('does nothing on a deployment without Chatwoot', () => {
		expect(() => renderHook(() => useHiddenChatwootBubble(true)).unmount()).not.toThrow();
	});
});
