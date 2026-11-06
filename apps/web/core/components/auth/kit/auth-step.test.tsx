/** @jest-environment jsdom */
import { playStepArrival } from './auth-step';

function stubReducedMotion(reduces: boolean) {
	window.matchMedia = jest.fn().mockReturnValue({ matches: reduces }) as unknown as typeof window.matchMedia;
}

describe('playStepArrival', () => {
	it('shows the step as it is where the browser has no Web Animations API', () => {
		stubReducedMotion(false);
		const step = document.createElement('div');
		Object.defineProperty(step, 'animate', { value: undefined });

		expect(() => playStepArrival(step, 'forward')).not.toThrow();
	});

	it('plays the arrival where the browser can animate', () => {
		stubReducedMotion(false);
		const step = document.createElement('div');
		const animate = jest.fn();
		Object.defineProperty(step, 'animate', { value: animate });

		playStepArrival(step, 'backward');

		expect(animate).toHaveBeenCalledTimes(1);
	});
});
