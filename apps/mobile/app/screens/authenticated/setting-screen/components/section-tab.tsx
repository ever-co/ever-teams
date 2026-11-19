import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { translate } from '../../../../i18n';
import { typography, useAppTheme, useWebTheme } from '../../../../theme';
import { observer } from 'mobx-react-lite';
import { useOrganizationTeam } from '../../../../services/hooks/use-organization';
import { SvgXml } from 'react-native-svg';
import {
	peopleIconActive,
	peopleIconActiveDark,
	peopleIconGrey,
	userActive,
	userActiveDark,
	userGrey
} from '../../../../components/svgs/icons';
import { underlineTabLookOf } from '../../../../../src/theme/underline-tab';

interface ISectionTab {
	id: 1 | 2;
	title: string;
}

const PERSONAL_TAB = 1;
const TEAM_TAB = 2;

/** The tab's icon: its active drawing in the scheme's ink, the grey one otherwise. */
function sectionIconOf(id: ISectionTab['id'], isActive: boolean, dark: boolean): string {
	const isPersonal = id === PERSONAL_TAB;
	if (!isActive) {
		if (isPersonal) {
			return userGrey;
		}
		return peopleIconGrey;
	}
	if (isPersonal) {
		if (dark) {
			return userActiveDark;
		}
		return userActive;
	}
	if (dark) {
		return peopleIconActiveDark;
	}
	return peopleIconActive;
}

const SectionTab = observer(
	({ activeTabId, toggleTab }: { activeTabId: number; toggleTab: React.Dispatch<React.SetStateAction<1 | 2>> }) => {
		const { activeTeam } = useOrganizationTeam();
		const theme = useWebTheme();
		const sections: ISectionTab[] = [
			{
				id: PERSONAL_TAB,
				title: translate('settingScreen.personalSection.name')
			},
			{
				id: TEAM_TAB,
				title: translate('settingScreen.teamSection.name')
			}
		];

		useEffect(() => {
			if (!activeTeam) {
				toggleTab(PERSONAL_TAB);
			}
		}, [activeTeam]);

		return (
			<View accessibilityRole="tablist" style={[styles.container, { borderBottomColor: theme.colors.border }]}>
				{sections.map((tab, idx) => (
					<Tab key={idx} isActiveTab={tab.id === activeTabId} item={tab} toggleTab={toggleTab} />
				))}
			</View>
		);
	}
);

const Tab = observer(
	({
		item,
		isActiveTab,
		toggleTab
	}: {
		item: ISectionTab;
		isActiveTab: boolean;
		toggleTab: React.Dispatch<React.SetStateAction<1 | 2>>;
	}) => {
		const { dark } = useAppTheme();
		const theme = useWebTheme();
		const { activeTeam } = useOrganizationTeam();
		const look = underlineTabLookOf(isActiveTab, theme);

		const selectTab = () => {
			const isTeamWithoutTeam = item.id === TEAM_TAB && !activeTeam;
			if (isTeamWithoutTeam) {
				return;
			}
			toggleTab(item.id);
		};

		return (
			<TouchableOpacity
				testID={`settings-tab-${item.id}`}
				accessibilityRole="tab"
				accessibilityState={{ selected: isActiveTab }}
				style={[styles.tab, look.tab]}
				onPress={selectTab}
			>
				<SvgXml xml={sectionIconOf(item.id, isActiveTab, dark)} />
				<Text style={[styles.text, { color: look.titleColor }]}>{item.title}</Text>
			</TouchableOpacity>
		);
	}
);

const styles = StyleSheet.create({
	container: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		flexDirection: 'row',
		width: '100%'
	},
	tab: {
		alignItems: 'center',
		flex: 1,
		flexDirection: 'row',
		gap: 8,
		justifyContent: 'center',
		marginBottom: -StyleSheet.hairlineWidth,
		minHeight: 44,
		paddingVertical: 10
	},
	text: {
		fontFamily: typography.primary.medium,
		fontSize: 14
	}
});

export default SectionTab;
