import React from "react"
import { View, Text, Image, StyleSheet } from "react-native"

const HomeHeader = () => {
  return (
    <View style={styles.mainContainer}>
      <View>
        <View style={styles.firstContainer}>
          <Text style={styles.textColor}>9: 41</Text>
          <View style={styles.icons}>
            <Image source={require("../../../../../assets/icons/icons8-wi-fi-15.png")}></Image>
            <Image source={require("../../../../../assets/icons/icons8-signal-15.png")}></Image>
            <Image
              source={require("../../../../../assets/icons/icons8-full-battery-15.png")}
            ></Image>
          </View>
        </View>

        <View style={styles.secondContainer}>
          <Image source={require("../../../../../assets/images/gauzy-teams.png")}></Image>
          <View style={{ flexDirection: "column" }}>
            <View style={styles.line}></View>
            <View style={styles.line}></View>
            <View style={styles.line}></View>
          </View>
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
    marginBottom: 10,
  },
  textColor: {
    color: "#FFFFFF",
  },
  secondContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 15,
    paddingRight: 15,
  },
  icons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "20%",
  },
  firstContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 25,
    paddingRight: 15,
    marginBottom: 10,
  },
  line: {
    backgroundColor: "#fff",
    height: 2,
    width: 20,
    marginBottom: 3,
  },
})

export default HomeHeader
