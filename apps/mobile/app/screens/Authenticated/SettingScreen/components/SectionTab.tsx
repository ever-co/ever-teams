import { observer } from "mobx-react-lite";
import React, { useState } from "react";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"
import { StyleSheet, View, Image, Text, TouchableOpacity } from "react-native";
import { useAppTheme } from "../../../../app";
import { translate } from "../../../../i18n";
import { typography } from "../../../../theme";



interface ISectionTab {
    id: number;
    title: string;
}

const SectionTab = ({ activeTabId, toggleTab }: { activeTabId: number, toggleTab: (tab: number) => unknown }) => {

    const sections: ISectionTab[] = [
        {
            id: 1,
            title: translate("settingScreen.personalSection.name"),
        },
        {
            id: 2,
            title: translate("settingScreen.teamSection.name"),
        }
    ];

    const { colors } = useAppTheme();
    return (
        <View style={[styles.contaniner, { backgroundColor: colors.background2 }]}>
            {sections.map((tab, idx) => (
                <Tab
                    key={idx}
                    isActiveTab={tab.id === activeTabId}
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
    const { colors } = useAppTheme();
    return (
        <TouchableOpacity
            style={isActiveTab ? [styles.activeSection, { backgroundColor: colors.background, borderColor: colors.secondary }] : [styles.inactiveSection]}
            onPress={() => toggleTab(item.id)}
        >
            {item.id == 1 ?
                <Ionicons name="person" size={24} color={isActiveTab ? colors.secondary : colors.tertiary} /> :
                <FontAwesome5 name="users" size={24} color={isActiveTab ? colors.secondary : colors.tertiary} />
            }
            <Text style={[styles.text, isActiveTab ? { fontSize: 16, color: colors.secondary } : { color: colors.tertiary }]}>{item.title}</Text>
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
    text: {
        left: 10,
        fontSize: 14,
        fontFamily: typography.primary.semiBold,
        color: "#3826A6"
    },
})

export default SectionTab;