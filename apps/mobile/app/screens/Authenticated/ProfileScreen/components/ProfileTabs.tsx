import { observer } from "mobx-react-lite";
import React, { FC } from "react";
import { View, ViewStyle } from "react-native";
import { useAppTheme } from "../../../../app";
import { translate } from "../../../../i18n";
import TaskTab from "./TaskTab";

interface Props {
    onChangeTab: (index: number) => unknown
    activeTab: number;
    countTasksByTab: (index: number) => number
}

const ProfileTabs: FC<Props> = observer(({ onChangeTab, activeTab, countTasksByTab }) => {
    const { colors } = useAppTheme();
    const tabs = [translate("tasksScreen.workedTab"), translate("tasksScreen.assignedTab"), translate("tasksScreen.unassignedTab")];
    return (
        <View style={{ ...$tabWrapper, backgroundColor: colors.background }}>
            {tabs.map((item, idx) => (
                <TaskTab
                    key={idx}
                    setSelectedTabIndex={onChangeTab}
                    tabIndex={idx}
                    selectedTabIndex={activeTab}
                    tabTitle={item}
                    countTasks={countTasksByTab(idx)}
                />
            ))}
        </View>
    )
})

const $tabWrapper: ViewStyle = {
    flexDirection: 'row',
    width: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 20,
}

export default ProfileTabs;