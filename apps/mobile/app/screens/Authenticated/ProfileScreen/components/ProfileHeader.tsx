import React from "react"
import { View, StyleSheet, Image } from "react-native"
import { colors } from "../../../../theme"
import { Feather } from "@expo/vector-icons"

// COMPONENTS
import { Text } from "../../../../components"
import { IUser } from "../../../../services/interfaces/IUserData"

type IProfileHeader = {
  image: string
  name: string
  email: string
}

const ProfileHeader = (member:IUser) => {
  return (
    <View style={styles.container}>
      <View style={styles.firstContainer}>
        <View style={styles.pictureContainer}>
          <Image
            source={{uri:member.imageUrl}}
            style={styles.profileImage}
          />
          <View style={styles.onlineIcon} />
        </View>
      </View>

      <View style={styles.secondContainer}>
        <View style={{ flexDirection: "row" }}>
          <Text style={styles.name}>{member?.name}</Text>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Text style={styles.email}>{member.email}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: "18%",
    backgroundColor: colors.palette.neutral200,
  },
  firstContainer: {
    backgroundColor: "#1B005D",
    alignItems: "center",
    height: "10%",
  },
  profileImage: {
    borderRadius: 200,
    padding: 0,
    left: 2,
    width: 80,
    height: 80,
    top: "2%",
  },
  pictureContainer: {
    position: "absolute",
    bottom: "auto",
    top: -20,
    backgroundColor: "#fff",
    borderRadius: 75,
    width: 84,
    height: 85,
  },
  secondContainer: {
    marginTop: 54,
    alignItems: "center",
  },
  name: {
    color: "#1B005D",
    fontSize: 25,
    fontWeight: "bold",
  },
  email: {
    color: "#B0B5C7",
    fontSize: 18,
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
  onlineIcon: {
    backgroundColor: "green",
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
    right: 9,
    top: 64,
    borderWidth: 1,
    borderColor: "#fff",
  },
})

export default ProfileHeader
