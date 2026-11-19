import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { TouchableOpacity, Text, View, TextStyle, ViewStyle, FontVariant } from 'react-native';
import { typography, useWebTheme } from '../../../../theme';
import { hsl, webColorTokens } from '../../../../../src/theme/tokens';
import type { Theme } from '../../../../../src/theme/use-theme';

interface Props {
	setSelectedTab: () => unknown;
	isSelected: boolean;
	tabTitle: string;
	countTasks: number;
}

const SELECTED_COUNT_ALPHA = 0.12;

/** A tab's count as the web's quiet chip: the selected tab's on a primary tint, the others on the muted fill. */
export function countChipColorsOf(isSelected: boolean, theme: Theme) {
	if (isSelected) {
		return {
			backgroundColor: hsl(webColorTokens[theme.scheme].primary, SELECTED_COUNT_ALPHA),
			color: theme.colors['primary-ink']
		};
	}
	return { backgroundColor: theme.colors.muted, color: theme.colors['muted-foreground'] };
}

function tabTitleColorOf(isSelected: boolean, theme: Theme) {
	if (isSelected) {
		return theme.colors.foreground;
	}
	return theme.colors['muted-foreground'];
}

function tabStyleOf(isSelected: boolean, theme: Theme): ViewStyle {
	if (isSelected) {
		return { ...$selectedTab, borderBottomColor: theme.colors['primary-ink'] };
	}
	return $unselectedTab;
}

const TaskTab: FC<Props> = observer(({ setSelectedTab, isSelected, tabTitle, countTasks }) => {
	const theme = useWebTheme();
	const count = countChipColorsOf(isSelected, theme);
	return (
		<TouchableOpacity
			testID="task-tab"
			style={[$container, tabStyleOf(isSelected, theme)]}
			activeOpacity={0.7}
			onPress={() => setSelectedTab()}
		>
			<Text style={[$tabText, { color: tabTitleColorOf(isSelected, theme) }]}>{tabTitle}</Text>
			<View testID="task-tab-count" style={[$wrapperCountTasks, { backgroundColor: count.backgroundColor }]}>
				<Text style={[$countTasks, { color: count.color }]}>{countTasks}</Text>
			</View>
		</TouchableOpacity>
	);
});

export default TaskTab;

const TABULAR_DIGITS: FontVariant[] = ['tabular-nums'];

const $countTasks: TextStyle = {
	fontSize: 11,
	fontWeight: '500',
	fontFamily: typography.secondary.medium,
	fontVariant: TABULAR_DIGITS
};

const $container: ViewStyle = {
	flexDirection: 'row',
	flex: 1,
	marginHorizontal: 4,
	justifyContent: 'center',
	paddingBottom: 10
};

const $unselectedTab: ViewStyle = {
	padding: 10,
	flexDirection: 'row'
};

const $wrapperCountTasks: ViewStyle = {
	minWidth: 18,
	left: 3,
	borderRadius: 5,
	paddingHorizontal: 4,
	height: 18,
	justifyContent: 'center',
	alignItems: 'center'
};

const $selectedTab: ViewStyle = {
	borderBottomWidth: 2,
	padding: 10,
	flexDirection: 'row'
};

const $tabText: TextStyle = {
	fontFamily: typography.primary.semiBold,
	fontSize: 12
};
