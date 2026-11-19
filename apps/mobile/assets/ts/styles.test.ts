import { StyleSheet } from 'react-native';
import { GLOBAL_STYLE as GS } from './styles';

describe('the shared shadows', () => {
	it.each([
		['shadow', GS.shadow],
		['shadowSm', GS.shadowSm],
		['shadowLg', GS.shadowLg]
	] as const)("%s is one of the web's black shadows, without Android elevation", (_name, style) => {
		expect(style).not.toHaveProperty('elevation');
		expect(style).not.toHaveProperty('shadowColor');
		expect(style.boxShadow).toMatch(/^(\d+ -?\d+px -?\d+px( -?\d+px)? rgba\(0, 0, 0, 0?\.\d+\)(, )?)+$/);
	});

	it('noShadow takes a shared shadow away when it comes after it', () => {
		expect(StyleSheet.flatten([GS.shadow, GS.noShadow]).boxShadow).toEqual([]);
	});
});
