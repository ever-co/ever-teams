import React from "react"
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native"

type IHomeHeader = {
  setShowHam?: any
}

const HomeHeader = ({ setShowHam }: IHomeHeader) => {
  return (
    <View style={styles.mainContainer}>
      <View>
        <View style={styles.secondContainer}>

          <Image source={require("../../../../../assets/images/gauzy-teams.png")} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (setShowHam !== undefined) {
                setShowHam(true)
              }
            }}
            style={{ flexDirection: "column" }}
          >
            <View style={styles.line} />
            <View style={styles.line} />
            <View style={styles.line} />
          </TouchableOpacity>

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
    justifyContent: "flex-start",
    paddingLeft: 15,
    paddingRight: 15,
    height: 30,
    paddingTop: 12,
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
