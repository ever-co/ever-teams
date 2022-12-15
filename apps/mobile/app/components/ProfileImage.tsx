import React, { FC } from 'react'
import {View, Image, StyleSheet} from 'react-native'

interface Props{
    imageUrl:string
}
const ProfileImage: FC<Props> = ({imageUrl}) => {
    return (
        <View style={styles.container}>
            <View style={styles.pictureContainer}>
                <Image
                    source={{ uri:imageUrl }}
                    style={styles.profileImage}
                    resizeMode="contain"
                />
                <View style={styles.onlineIcon} />
            </View>
        </View>
    )
}
export default ProfileImage;

const styles=StyleSheet.create({
    container: {
        alignItems: "center",
        height: "10%",
      },
      profileImage: {
        borderRadius: 200,
        width: 60,
        height: 60,
      },
      pictureContainer: {
        backgroundColor: "#86DAA9",
        padding: 2,
        left: 10,
        borderRadius: 75,
      },
      onlineIcon: {
        backgroundColor: "green",
        width: 15,
        height: 15,
        borderRadius: 10,
        position: "absolute",
        right: 9,
        top: 48,
        borderWidth: 3,
        borderColor: "#fff",
      },
})