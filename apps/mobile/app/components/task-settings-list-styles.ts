import { StyleSheet } from 'react-native';
import { typography } from '../theme';

/** What the task settings list screens draw alike: the title, the list header and the Create buttons. */
export const taskSettingsListStyles = StyleSheet.create({
	btnText: {
		color: '#3826A6',
		fontFamily: typography.primary.semiBold,
		fontSize: 18,
		fontStyle: 'normal',
		marginLeft: 8
	},
	btnTextSmall: {
		color: '#3826A6',
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		fontStyle: 'normal',
		marginLeft: 4
	},
	container: {
		alignItems: 'center',
		flexDirection: 'row',
		width: '100%'
	},
	createButton: {
		alignItems: 'center',
		alignSelf: 'center',
		borderColor: '#3826A6',
		borderRadius: 12,
		borderWidth: 2,
		flexDirection: 'row',
		justifyContent: 'center',
		marginBottom: 16,
		marginTop: 8,
		padding: 14,
		width: '90%'
	},
	createButtonSmall: {
		alignItems: 'center',
		borderColor: '#3826A6',
		borderRadius: 8,
		borderWidth: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		padding: 6,
		paddingHorizontal: 10
	},
	listHeaderContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
		width: '100%'
	},
	title: {
		alignSelf: 'center',
		fontFamily: typography.primary.semiBold,
		fontSize: 16,
		textAlign: 'center',
		width: '80%'
	},
	title2: {
		color: '#7E7991',
		fontFamily: typography.primary.semiBold,
		fontSize: 16
	}
});
