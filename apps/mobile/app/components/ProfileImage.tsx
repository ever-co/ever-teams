import React, { FC } from 'react'
import { View, Image, StyleSheet } from 'react-native'
import { Avatar, Badge } from 'react-native-paper'
import { useAppTheme } from '../app'

interface Props {
    imageUrl: string,
    size?: number
}
const ProfileImage: FC<Props> = ({ imageUrl, size }) => {
    const {colors}=useAppTheme();
    return (
        <View style={styles.container}>
            <View>
                <Avatar.Image size={70} source={{ uri: imageUrl }} />
                <Badge size={25} style={[styles.onlineIcon,{borderColor:colors.background}]}/>
            </View>
        </View>
    )
}
export default ProfileImage;

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        height: "10%",
    },
    profileImage: {
        borderRadius: 200,
        width: 56,
        height: 56,
        borderWidth: 3,
        borderColor: "#86DAA9"
    },
    onlineIcon: {
        backgroundColor: "#27AE60",
        position: "absolute",
        borderWidth:4,
        right: 0,
        bottom: 0,

    },
})