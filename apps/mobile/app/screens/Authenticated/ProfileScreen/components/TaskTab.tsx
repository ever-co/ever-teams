import { observer } from "mobx-react-lite";
import React, { FC } from "react";
import { TouchableOpacity, Text, View, StyleSheet, TextStyle, ViewStyle } from "react-native"
import { useAppTheme } from "../../../../app";
import { typography } from "../../../../theme";

interface Props {
    setSelectedTabIndex: (index: number) => unknown
    tabIndex: number
    selectedTabIndex: number
    tabTitle: string;
    countTasks: number;
}
const TaskTab: FC<Props> = observer(({ setSelectedTabIndex, tabIndex, selectedTabIndex, tabTitle, countTasks }) => {
    const { colors, dark } = useAppTheme()
    const isSelected = selectedTabIndex === tabIndex;
    return (
        <TouchableOpacity
            style={[$container, isSelected ? { ...$selectedTab, borderBottomColor: colors.primary } : $unselectedTab]}
            activeOpacity={0.7}
            onPress={() => setSelectedTabIndex(tabIndex)}
        >
            <Text style={[$tabText, { color: isSelected ? colors.primary : colors.tertiary }]}>{tabTitle}</Text>
            {!dark ?
                <View style={[$wrapperCountTasks, { backgroundColor: isSelected ? colors.secondary : colors.background2 }]}>
                    <Text style={[$countTasks, { color: isSelected ? colors.background : colors.tertiary }]}>{countTasks}</Text>
                </View>
                :
                <View style={[$wrapperCountTasks, { backgroundColor: isSelected ? "#47484D" : "#24282F" }]}>
                    <Text style={[$countTasks, { color: isSelected ? colors.primary: "#7E7991" }]}>{countTasks}</Text>
                </View>
            }
        </TouchableOpacity>
    )
})

export default TaskTab;

const $countTasks: TextStyle = {
    fontSize: 10,
    fontFamily: typography.secondary.medium
}

const $container: ViewStyle = {
    flexDirection: "row",
    flex: 1,
    marginHorizontal: 4,
    justifyContent: "center",
    paddingBottom: 10,
}
const $unselectedTab: ViewStyle = {
    padding: 10,
    flexDirection: "row"
}
const $wrapperCountTasks: ViewStyle = {
    width: 18,
    left: 3,
    borderRadius: 4,
    paddingHorizontal: 2,
    height: 18,
    justifyContent: "center",
    alignItems: 'center',
}

const $selectedTab: ViewStyle = {
    borderBottomWidth: 2,
    padding: 10,
    flexDirection: "row"
}

const $tabText: TextStyle = {
    fontFamily: typography.primary.semiBold,
    fontSize: 12,
}
