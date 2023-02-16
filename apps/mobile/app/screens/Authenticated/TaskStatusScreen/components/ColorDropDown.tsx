import React, { useEffect, useState } from 'react'
import { AntDesign, Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Badge } from 'react-native-paper';
import { IColor } from '../../../../services/interfaces/IColor';
import { useAppTheme } from '../../../../app';
import { translate } from '../../../../i18n';

const ColorDropDown = (
    { color, setColor }:
        { color: string, setColor: (color: string) => unknown }) => {
    const { colors } = useAppTheme();
    const [showDropdown, setShowDropdown] = useState(false)
    const [selectedColor, setSelectedColor] = useState<IColor>(null)
    const [colorsList, setColors] = useState<IColor[]>([
        {
            color: '#FF0000',
            title: '#FF0000',
        },
        {
            color: '#00FF00',
            title: '#00FF00',
        },
        {
            color: '#0000FF',
            title: '#0000FF',
        },
        {
            color: '#ECE8FC',
            title: '#ECE8FC',
        },
        {
            color: '#D4EFDF',
            title: '#D4EFDF',
        },
        {
            color: '#D6E4F9',
            title: '#D6E4F9',
        },
        {
            color: '#F5B8B8',
            title: '#F5B8B8',
        },
        {
            color: '#F3D8B0',
            title: '#F3D8B0',
        },
        {
            color: '#F2F2F2',
            title: '#F2F2F2',
        },
        {
            color: '#F5F1CB',
            title: '#F5F1CB',
        },
        {
            color: '#4192AB',
            title: '#4192AB',
        },
        {
            color: '#4E4AE8',
            title: '#4E4AE8',
        },
        {
            color: '#E78F5E',
            title: '#E78F5E',
        },
    ]);

    useEffect(() => {
        if (color) {
            setSelectedColor({
                title: color,
                color: color
            })
        } else {
            setSelectedColor(null)
        }
    }, [color])

    return (
        <View>
            <TouchableOpacity style={styles.container} onPress={() => setShowDropdown(!showDropdown)}>
                <View style={{ flexDirection: "row", alignItems: "center", }}>
                    <Badge size={24} style={{ backgroundColor: selectedColor ? selectedColor?.color : "#D9D9D9" }} />
                    <Text style={{ ...styles.textColor, color: colors.primary }}>{selectedColor ? selectedColor?.title : translate("settingScreen.statusScreen.statusColorPlaceholder")}</Text>
                </View>
                {!showDropdown ? <AntDesign name="down" size={24} color="#1A1C1E" /> :
                    <AntDesign name="up" size={24} color="#1A1C1E" />
                }
            </TouchableOpacity>
            {showDropdown ? <View style={{ ...styles.dropdownContainer, backgroundColor: colors.background, shadowColor: colors.border }}>
                <ScrollView bounces={false}>
                    {colorsList.map((color, index) => (
                        <TouchableOpacity
                            key={index}
                            style={{ ...styles.itemColor, backgroundColor: colors.background2 }}
                            onPress={() => {
                                setShowDropdown(false)
                                setSelectedColor(color)
                                setColor(color.color)
                            }}>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Badge size={24} style={{ backgroundColor: color.color }} />
                                <Text style={{ ...styles.textColor, color: colors.primary }}>{color.color}</Text>
                            </View>
                            {selectedColor?.color === color.color ? <AntDesign name="checkcircle" size={24} color="#27AE60" /> :
                                <Feather name="circle" size={24} color="rgba(40, 32, 72, 0.43)" />}
                        </TouchableOpacity>
                    ))}


                </ScrollView>
            </View> : null}
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
    textColor: {
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
    itemColor: {
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
export default ColorDropDown