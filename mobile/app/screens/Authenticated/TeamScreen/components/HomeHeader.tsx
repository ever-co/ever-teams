import React from "react"
import { View, Text, Image, StyleSheet } from "react-native"

const HomeHeader = () => {
  return (
    <View style={styles.mainContainer}>
      <View>
        <View style={styles.secondContainer}>
          <View style={{ flexDirection: "column" }}>
            <View style={styles.line} />
            <View style={styles.line} />
            <View style={styles.line} />
          </View>
          <Image source={require("../../../../../assets/images/gauzy-teams.png")} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: "#1B005D",
    paddingTop: 10,
    paddingBottom: 20,
  },
  textColor: {
    color: "#FFFFFF",
  },
  secondContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 15,
    paddingRight: 15,
    paddingTop: 10,
    height: 30,
    alignItems: "center",
  },
  icons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "20%",
  },
  line: {
    backgroundColor: "#fff",
    height: 2,
    width: 20,
    marginBottom: 3,
  },
})

export default HomeHeader
