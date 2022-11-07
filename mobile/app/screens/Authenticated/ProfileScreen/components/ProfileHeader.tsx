import React from "react"
import { View, StyleSheet, Text, Image } from "react-native"
import { colors } from "../../../../theme"
import { Feather } from "@expo/vector-icons"

type IProfileHeader = {
  image: string
  name: string
  email: string
}

const ProfileHeader = () => {
  return (
    <View style={styles.container}>
      <View style={styles.firstContainer}>
        <View style={styles.pictureContainer}>
          <Image
            source={require("../../../../../assets/images/Ruslan.png")}
            style={styles.profileImage}
          />
          <View style={styles.wrapEditIcon}>
            <Feather name="edit-2" size={10} color="gray" />
          </View>
          <View
            style={{
              backgroundColor: "green",
              width: 10,
              height: 10,
              borderRadius: 5,
              position: "absolute",
              right: 10,
              top: 64,
              borderWidth: 1,
              borderColor: "#fff",
            }}
          />
        </View>
      </View>

      <View style={styles.secondContainer}>
        <View style={{ flexDirection: "row" }}>
          <Text style={styles.name}>Ruslan Konviser</Text>
          <View style={styles.wrapEditIconSmall}>
          <Feather name="edit-2" size={8} color="gray" />
          </View>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Text style={styles.email}>Ruslan.k@everiq.com</Text>
          <View style={[styles.wrapEditIconSmall, { top: 4 }]}>
          <Feather name="edit-2" size={8} color="gray" />
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height:'18%',
    backgroundColor:colors.palette.neutral200
  },
  firstContainer: {
    backgroundColor: "#1B005D",
    alignItems: "center",
    height: "10%",
  },
  profileImage: {
    borderRadius: 200,
    padding: 0,
    right: 18,
    width: 120,
    height: 120,
    top: "-20%",
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
    marginTop: 48,
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
    top: 10,
    left: 5,
    backgroundColor: "#fff",
    padding: 5,
    borderRadius: 10,
    borderColor: colors.border,
    borderWidth: 1,
  },
})

export default ProfileHeader
