import React from "react"
import { View, StyleSheet, Text, Image } from "react-native"

type IProfileHeader = {
  image: string
  name: string
  email: string
}

const ProfileHeader = () => {
  return (
    <View>
      <View style={styles.firstContainer}>
        <Text style={styles.profile}>Profile</Text>
        <Image
          source={require("../../../../../assets/images/Ruslan.png")}
          style={styles.profileImage}
        />
      </View>

      <View style={styles.secondContainer}>
        <Text style={styles.name}>Ruslan Konviser</Text>
        <Text style={styles.email}>Ruslan.k@everiq.com</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  firstContainer: {
    backgroundColor: "#1B005D",
    // justifyContent: "center",
    alignItems: "center",
  },
  profile: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  profileImage: {
    borderRadius: 200,
    padding: 0,
    backgroundColor: "#fff",
    position: "relative",
    top: "50%",
  },
  secondContainer: {
    marginTop: 120,
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
})

export default ProfileHeader
