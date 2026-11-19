import { switchKnobColorOf } from './switch-knob';
import { colors } from '../theme/colors';

describe("a switch's knob", () => {
	it('takes its own fill while on', () => {
		expect(switchKnobColorOf({ on: true, disabled: false, onFill: '#DBD3FA', knobFill: '#3826A6' })).toBe(
			'#3826A6'
		);
	});

	it("takes the track's on fill while off", () => {
		expect(switchKnobColorOf({ on: false, disabled: false, onFill: '#DBD3FA', knobFill: '#3826A6' })).toBe(
			'#DBD3FA'
		);
	});

	it('falls back to the disabled color, then to the light neutral', () => {
		expect(switchKnobColorOf({ on: false, disabled: true })).toBe(colors.palette.neutral600);
		expect(switchKnobColorOf({ on: true, disabled: false })).toBe(colors.palette.neutral100);
	});
});
