import React, { FC } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { AntDesign, Ionicons } from "@expo/vector-icons"
import { useAppTheme } from '../../../../app'
import { typography } from '../../../../theme';
import { ITaskSizeItem } from '../../../../services/interfaces/ITaskSize';

interface ISizeItem {
    size: ITaskSizeItem;
    onDeleteSize: () => unknown;
    openForEdit: () => unknown;
}

const StatusItem: FC<ISizeItem> = ({ size, onDeleteSize, openForEdit }) => {
    const { colors, dark } = useAppTheme();
    return (
        <View style={{
            ...styles.container,
            backgroundColor: dark ? "#181C24" : colors.background,
            borderColor: "rgba(0,0,0,0.13)"
        }}>
            <View style={{ ...styles.statusContainer, backgroundColor: size.color }}>
                <AntDesign name="pay-circle-o1" size={20} color="#000" />
                <Text style={styles.text}>{size.name}</Text>
            </View>
            <View style={styles.rightSection}>
                <AntDesign size={16} name={"edit"} color={colors.primary} onPress={() => openForEdit()} />
                <Ionicons name="trash-outline" size={16} color={"#DE5536"} onPress={() => onDeleteSize()} />
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 6,
        paddingRight: 16,
        borderRadius: 10,
        marginTop: 16,
        borderWidth: 1
    },
    statusContainer: {
        flexDirection: "row",
        backgroundColor: "#D4EFDF",
        width: "60%",
        height: "100%",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        alignItems: "center"
    },
    rightSection: {
        flexDirection: "row",
        width: "16%",
        justifyContent: "space-between"
    },
    text: {
        marginLeft: 13.5,
        fontSize: 14,
        fontFamily: typography.primary.medium,
    }
})

export default StatusItem;