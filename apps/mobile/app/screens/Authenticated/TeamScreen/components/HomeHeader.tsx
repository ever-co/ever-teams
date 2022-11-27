import React from "react"
import { View, Image, StyleSheet, TouchableOpacity } from "react-native"
import { Feather } from '@expo/vector-icons';




const HomeHeader = (props) => {

  return (
    <View style={styles.mainContainer}>
      <View>
        <View style={styles.secondContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => props.navigation.openDrawer()}
            style={{ marginRight: 15 }}
          >
            <Feather name="menu" size={30} color="#fff" />
          </TouchableOpacity>
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
    justifyContent: "flex-start",
    paddingLeft: 15,
    paddingRight: 15,
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
