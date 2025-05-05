import { observer } from 'mobx-react-lite';
import React, { FC } from 'react';
import { View, ViewStyle } from 'react-native';
import { ITaskFilter } from '../../../../services/hooks/features/useTaskFilters';
import { useAppTheme } from '../../../../theme';
import TaskTab from './TaskTab';

interface Props {
	hook: ITaskFilter;
}

const ProfileTabs: FC<Props> = observer(({ hook }) => {
	const { colors } = useAppTheme();
	return (
		<View style={{ ...$tabWrapper, backgroundColor: colors.background }}>
			{hook.tabs.map((item, idx) => (
				<TaskTab
					key={idx}
					setSelectedTab={() => hook.setTab(item.tab)}
					isSelected={item.tab === hook.tab}
					tabTitle={item.name}
					countTasks={item.count}
				/>
			))}
		</View>
	);
});

const $tabWrapper: ViewStyle = {
	flexDirection: 'row',
	width: '100%',
	justifyContent: 'space-between',
	paddingHorizontal: 20
};

export default ProfileTabs;
