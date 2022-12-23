import React from "react"
import { View, StyleSheet, Image } from "react-native"
import { colors, typography } from "../../../../theme"
import { Feather } from "@expo/vector-icons"

// COMPONENTS
import { Text } from "../../../../components"
import { IUser } from "../../../../services/interfaces/IUserData"
import ProfileImage from "../../../../components/ProfileImage"


const ProfileHeader = (member: IUser) => {
  return (
    <View style={styles.container}>
      <ProfileImage imageUrl={member.imageUrl} />
      <View style={styles.containerInfo}>
        <Text style={styles.name}>{member?.name}</Text>
        <Text style={styles.email}>{member.email}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal:20,
    backgroundColor:"#fff"
  },
  containerInfo: {
    marginLeft:10,
  },
  name: {
    color: "#282048",
    fontSize: 18,
    fontFamily:typography.primary.semiBold
  },
  email: {
    color: "#7E7991",
    fontSize: 12,
    fontFamily:typography.secondary.medium
  },
  wrapEditIcon: {
    position: "absolute",
    width: 22,
    height: 22,
    right: 2,
    top: 5,
    backgroundColor: "#fff",
    padding: 5,
    borderRadius: 12,
    borderColor: colors.border,
    borderWidth: 1,
  },
  wrapEditIconSmall: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    left: 5,
    backgroundColor: "#fff",
    padding: 5,
    borderRadius: 10,
    borderColor: colors.border,
    borderWidth: 1,
  },
})

export default ProfileHeader
