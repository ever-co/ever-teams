import React, { FC } from "react"
import { View, Image, StyleSheet, TouchableOpacity, Dimensions } from "react-native"
import { Feather } from '@expo/vector-icons';
import HeaderTimer from "../../../../components/HeaderTimer";

interface Props {
  showTimer: boolean,
  props: any
}

const { width } = Dimensions.get("window");
const HomeHeader: FC<Props> = ({ props, showTimer }) => {

  return (
    <View style={styles.mainContainer}>
      <View style={styles.secondContainer}>
        <Image style={styles.logo} source={require("../../../../../assets/images/new/gauzy-teams.png")} resizeMode="contain" />
        {showTimer &&
          <View style={{ width: width / 2.5 }}>
            <HeaderTimer />
          </View>
        }
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => props.navigation.openDrawer()}
        >
          <Feather name="menu" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 25,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.07,
    shadowRadius: 1.00,
    elevation: 1,
  },
  secondContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  logo: {
    width: 120,
    height: 15
  }
})

export default HomeHeader
