import React from "react"
import { View, StyleSheet, Text, Image } from "react-native"
import { colors } from "../../../../theme"

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
            <Image source={require("../../../../../assets/icons/pencil.png")} />
          </View>
        </View>
      </View>

      <View style={styles.secondContainer}>
        <View style={{ flexDirection: "row" }}>
          <Text style={styles.name}>Ruslan Konviser</Text>
          <View style={styles.wrapEditIconSmall}>
            <Image
              style={{ width: 10, height: 10 }}
              source={require("../../../../../assets/icons/pencil.png")}
            />
          </View>
        </View>
        <View style={{ flexDirection: "row" }}>
          <Text style={styles.email}>Ruslan.k@everiq.com</Text>
          <View style={[styles.wrapEditIconSmall, { top: 4 }]}>
            <Image
              style={{ width: 10, height: 10 }}
              source={require("../../../../../assets/icons/pencil.png")}
            />
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height:'45%'
  },
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
    top: "30%",
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
  wrapEditIcon: {
    position: "absolute",
    width: 30,
    height: 30,
    right: 20,
    top: 5,
    backgroundColor: "#fff",
    padding: 5,
    borderRadius: 15,
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
