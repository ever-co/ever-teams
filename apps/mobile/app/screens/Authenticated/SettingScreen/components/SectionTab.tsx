import React, { useState } from "react";
import { StyleSheet, View, Image, Text, TouchableOpacity } from "react-native";
import { colors, typography } from "../../../../theme";

export type ISectionTabs = "Personal" | "Team";

interface ISectionTab {
    title: ISectionTabs;
    activeIcon: any;
    inactiveIcon: any
}
const sections: ISectionTab[] = [
    {
        title: "Personal",
        activeIcon: require("../../../../../assets/icons/new/user-active.png"),
        inactiveIcon: require("../../../../../assets/icons/new/user-inactive.png")
    },
    {
        title: "Team",
        activeIcon: require("../../../../../assets/icons/new/people-active.png"),
        inactiveIcon: require("../../../../../assets/icons/new/people-inactive.png")
    }
];
const SectionTab = ({ activeTab, toggleTab }: { activeTab: ISectionTabs, toggleTab: (tab:ISectionTabs) => unknown }) => {

    return (
        <View style={styles.contaniner}>
            {sections.map((tab, idx) => (
                <Tab
                    key={idx}
                    isActiveTab={activeTab === tab.title}
                    item={tab}
                    toggleTab={toggleTab}
                />
            ))}
        </View>
    )
}

const Tab = ({
    item,
    isActiveTab,
    toggleTab
}
    :
    {
        item: ISectionTab,
        isActiveTab: boolean
        toggleTab: (tab: ISectionTabs) => unknown
    }) => {
    return (
        <TouchableOpacity
            style={isActiveTab ? styles.activeSection : styles.inactiveSection}
            onPress={() => toggleTab(item.title)}
        >
            <Image source={isActiveTab ? item.activeIcon : item.inactiveIcon} />
            <Text style={isActiveTab ? styles.activeText : styles.inactiveText}>{item.title}</Text>
        </TouchableOpacity>
    )
}


const styles = StyleSheet.create({
    contaniner: {
        width: "100%",
        height: 62,
        backgroundColor: "rgba(217, 217, 217, 0.3)",
        borderRadius: 70,
        flexDirection: 'row',
        justifyContent: "space-between",
        padding: 6
    },
    activeSection: {
        width: 155,
        height: 50,
        justifyContent: "center",
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: "#fff",
        borderWidth: 2,
        borderColor: colors.primary,
        borderRadius: 70,
        elevation: 10,
        shadowColor: "rgba(30, 12, 92, 0.26)",
        shadowOffset: { width: 10, height: 10 },
        shadowRadius: 8,
        shadowOpacity: 1
    },
    inactiveSection: {
        justifyContent: "center",
        flexDirection: 'row',
        alignItems: "center",
        width: 155
    },
    activeText: {
        left: 10,
        fontSize: 14,
        fontFamily: typography.primary.semiBold,
        color: "#3826A6"
    },
    inactiveText: {
        left: 10,
        fontSize: 16,
        fontFamily: typography.primary.semiBold,
        color: "#717274"
    }
})

export default SectionTab;