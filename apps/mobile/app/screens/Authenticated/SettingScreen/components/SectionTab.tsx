import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { StyleSheet, View, Image, Text, TouchableOpacity } from "react-native";
import { translate } from "../../../../i18n";
import { colors, typography } from "../../../../theme";



interface ISectionTab {
    id:number;
    title: string;
    activeIcon: any;
    inactiveIcon: any
}

const SectionTab =({ activeTabId, toggleTab }: { activeTabId: number, toggleTab: (tab: number) => unknown }) => {

    const sections: ISectionTab[] = [
        {
            id:1,
            title: translate("settingScreen.personalSection.name"),
            activeIcon: require("../../../../../assets/icons/new/user-active.png"),
            inactiveIcon: require("../../../../../assets/icons/new/user-inactive.png")
        },
        {
            id:2,
            title: translate("settingScreen.teamSection.name"),
            activeIcon: require("../../../../../assets/icons/new/people-active.png"),
            inactiveIcon: require("../../../../../assets/icons/new/people-inactive.png")
        }
    ];
    
    return (
        <View style={styles.contaniner}>
            {sections.map((tab, idx) => (
                <Tab
                    key={idx}
                    isActiveTab={tab.id===activeTabId}
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
        toggleTab: (tab: number) => unknown
    }) => {
    return (
        <TouchableOpacity
            style={isActiveTab ? styles.activeSection : styles.inactiveSection}
            onPress={() => toggleTab(item.id)}
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