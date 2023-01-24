import React from "react"
import { View, StyleSheet, Image } from "react-native"
import { typography } from "../../../../theme"
import { Feather } from "@expo/vector-icons"

// COMPONENTS
import { Text } from "../../../../components"
import { IUser } from "../../../../services/interfaces/IUserData"
import ProfileImage from "../../../../components/ProfileImage"
import { useAppTheme } from "../../../../app"


const ProfileHeader = (member: IUser) => {
  const {colors}=useAppTheme();
  return (
    <View style={[styles.container,{backgroundColor:colors.background}]}>
      <ProfileImage imageUrl={member.imageUrl} />
      <View style={styles.containerInfo}>
        <Text style={[styles.name,{color:colors.primary}]}>{member?.name}</Text>
        <Text style={[styles.email, {color:colors.tertiary}]}>{member.email}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingTop: 14,
    paddingBottom:24,
    paddingHorizontal:20,
    backgroundColor:"#fff"
  },
  containerInfo: {
    marginLeft:10,
   justifyContent:"center"
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
    borderWidth: 1,
  },
})

export default ProfileHeader
