import React, { FC } from "react"
import { Ionicons } from "@expo/vector-icons"
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native"
import { useAppTheme } from "../../../../app";
import { imgTitle } from "../../../../helpers/img-title";
import { useStores } from "../../../../models"
import { typography } from "../../../../theme";
import { Avatar } from "react-native-paper";

interface Props {
    imageUrl: string;
    buttonLabel: string;
    onDelete: () => unknown
    onChange: () => unknown
}
const PictureSection: FC<Props> = ({ imageUrl, buttonLabel, onChange, onDelete }) => {
    const { teamStore: { activeTeam } } = useStores();
    const { colors, dark } = useAppTheme();
    return (
        <View style={[styles.container, { backgroundColor: colors.background, opacity:0.9 }]}>
            {imageUrl.trim().length > 3 ?
                <Avatar.Image size={70} source={{ uri: imageUrl }} />
                :
                <Avatar.Text size={70} label={imgTitle(activeTeam.name)} labelStyle={styles.prefix} />
            }
            <TouchableOpacity style={[styles.changeAvatarBtn, { borderColor: colors.secondary }]} onPress={() => onChange()}>
                <Text style={[styles.changeAvatarTxt, { color: colors.secondary }]}>{buttonLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.deleteContainer, { backgroundColor: dark ? "#3D4756" : "#E6E6E9" }]} onPress={() => onDelete()}>
                <Ionicons name="trash-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
        </View>
    )
}

export default PictureSection;

const styles = StyleSheet.create({
    container: {
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingVertical: 20
    },
    pictureContainer: {
        width: 70,
        height: 70,
        borderRadius: 40
    },
    changeAvatarBtn: {
        height: 42,
        width: 168,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#3826A6",
        borderRadius: 7,
    },
    changeAvatarTxt: {
        fontSize: 14,
        fontFamily: typography.primary.semiBold
    },
    deleteContainer: {
        borderRadius: 7,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 11,
        paddingHorizontal: 16
    },
    teamImage: {
        width: 70,
        height: 70,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 35,
        backgroundColor: "#C1E0EA",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 1.5,
        },
        shadowOpacity: 0.18,
        shadowRadius: 1.00,
        elevation: 2,
    },
    prefix: {
        fontSize: 24,
        fontFamily: typography.fonts.PlusJakartaSans.semiBold,
        fontWeight: "600"
    }
})