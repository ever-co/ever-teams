import React from 'react';
import { FlatList, FlatListProps, StyleSheet, View } from 'react-native';
import { useWebTheme } from '../theme';
import { settingsDividerOf, settingsListSurfaceOf } from '../../src/theme/settings-look';

/** A team's task settings list: its rows on the settings surface with a hairline between them, no frame without rows. */
export function TaskSettingsList<T>({ style, ...props }: Readonly<FlatListProps<T>>) {
	const theme = useWebTheme();
	const rowCount = props.data?.length ?? 0;

	return (
		<FlatList
			{...props}
			style={[styles.list, settingsListSurfaceOf(rowCount, theme), style]}
			ItemSeparatorComponent={() => <View testID="task-settings-divider" style={settingsDividerOf(theme)} />}
		/>
	);
}

const styles = StyleSheet.create({
	list: {
		flexGrow: 0,
		width: '100%'
	}
});
