import React, { useEffect, useState } from 'react'
import { AntDesign } from '@expo/vector-icons';
import {StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAppTheme } from '../../../../app';
import { IIcon } from '../../../../services/interfaces/IIcon';
import { translate } from '../../../../i18n';

const IconDropDown = (
    { icon, setIcon }:
        { icon: any, setIcon: (icon: any) => unknown }) => {
    const { colors } = useAppTheme();
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedIcon, setSelectedIcon] = useState<IIcon>(null)
    const [iconsList, setIconsList] = useState<IIcon[]>([])
    useEffect(() => {
        if (icon) {
            setSelectedIcon({
                title: icon,
                icon: icon
            })
        } else {
            setSelectedIcon(null)
        }
    }, [icon])

    return (
        <View>
            <TouchableOpacity style={styles.container} onPress={() => setShowDropdown(!showDropdown)}>
                <View style={{ flexDirection: "row", alignItems: "center", }}>
                    <Text style={{ ...styles.textIcon, color: colors.primary }}>{selectedIcon ? selectedIcon?.title : translate("settingScreen.priorityScreen.priorityIconPlaceholder")}</Text>
                </View>
                {!showDropdown ? <AntDesign name="down" size={24} color="#1A1C1E" /> :
                    <AntDesign name="up" size={24} color="#1A1C1E" />
                }
            </TouchableOpacity>  
        </View>
    )
}


const styles = StyleSheet.create({
    container: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        height: 57,
        borderRadius: 12,
        borderColor: "#DCE4E8",
        borderWidth: 1,
        paddingHorizontal: 18,
        alignItems: "center",
        marginTop: 16
    },
    textIcon: {
        marginLeft: 10,
        color: "#D9D9D9"
    },
    dropdownContainer: {
        position: "absolute",
        width: "100%",
        height: 200,
        backgroundColor: "#fff",
        bottom: 0,
        paddingHorizontal: 16,
        paddingVertical: 20,
        marginBottom: 60,
        borderRadius: 24,
        shadowColor: "rgba(0,0,0,0.1)",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 12
    },
    itemIcon: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        borderWidth: 1,
        borderRadius: 12,
        borderColor: "rgba(0,0,0,0.13)",
        padding: 6,
        marginBottom: 10
    }
})
export default IconDropDown