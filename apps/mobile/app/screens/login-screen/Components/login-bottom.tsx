/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React from 'react';
import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import EStyleSheet from 'react-native-extended-stylesheet';
import { typography, useAppTheme } from '../../../theme';
import { SvgXml } from 'react-native-svg';
import { moonDarkLarge, moonLightLarge, sunDarkLarge, sunLightLarge } from '../../../components/svgs/icons';
import { useStores } from '../../../models';

const LoginBottom = () => {
	const {
		authenticationStore: { toggleTheme }
	} = useStores();

	const { dark, colors } = useAppTheme();
	return (
		<View style={{ ...styles.bottomSection, borderTopColor: dark ? colors.divider : 'rgba(0, 0, 0, 0.16)' }}>
			<Text style={styles.bottomSectionTxt}>
				© 2022-Present, Ever Teams by Ever Co. LTD. All rights reserved.
			</Text>
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end' }}>
				<TouchableOpacity
					style={[
						styles.toggle,
						dark ? { backgroundColor: '#1D222A' } : { backgroundColor: '#E7E7EA', paddingRight: 4 }
					]}
					onPress={() => toggleTheme()}
				>
					{dark ? (
						<View style={styles.iconsContainer}>
							<SvgXml height={24} width={24} xml={sunDarkLarge} />
							<SvgXml height={24} width={24} xml={moonDarkLarge} />
						</View>
					) : (
						<View style={styles.iconsContainer}>
							<View style={[styles.iconWrapper, { backgroundColor: 'white', height: 24, width: 24 }]}>
								<SvgXml height={16} width={16} xml={sunLightLarge} />
							</View>
							<View style={[styles.iconWrapper, { backgroundColor: 'transparent' }]}>
								<SvgXml height={16} width={16} xml={moonLightLarge} />
							</View>
						</View>
					)}
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default LoginBottom;

const { width } = Dimensions.get('window');

const styles = EStyleSheet.create({
	imageTheme: {
		height: '3.1rem',
		marginBottom: '-1.5rem'
	},
	iconsContainer: {
		alignItems: 'center',
		backgroundColor: 'transparent',
		display: 'flex',
		flexDirection: 'row',
		height: '100%',
		justifyContent: 'space-between',
		paddingLeft: 4,
		paddingRight: 4,
		width: '100%'
	},
	toggle: {
		borderRadius: 60,
		height: 32,
		width: 66,
		paddingHorizontal: 1
	},
	iconWrapper: { borderRadius: 60, padding: 0, justifyContent: 'center', alignItems: 'center' },
	bottomSection: {
		position: 'absolute',
		justifyContent: 'space-between',
		alignItems: 'center',
		width: width - 40,
		display: 'flex',
		flexDirection: 'row',
		alignSelf: 'center',
		bottom: 0,
		marginBottom: '2rem',
		paddingTop: '1rem',
		borderTopWidth: 1,
		zIndex: 100
	},
	bottomSectionTxt: {
		flex: 3,
		fontSize: '0.7rem',
		fontFamily: typography.primary.medium,
		color: 'rgba(126, 121, 145, 0.7)'
	}
});
