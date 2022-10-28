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
        <View style={styles.pictureContainer}>
          <Image
            source={require("../../../../../assets/images/Ruslan.png")}
            style={styles.profileImage}
          />
        </View>
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
    alignItems: "center",
    height: "35%",
  },
  profile: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  profileImage: {
    borderRadius: 200,
    padding: 0,
    width: "100%",
    top: "-15%",
  },
  pictureContainer: {
    position: "absolute",
    top: "60%",
    backgroundColor: "#fff",
    borderRadius: 5000,
    width: 150,
    height: 150,
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
