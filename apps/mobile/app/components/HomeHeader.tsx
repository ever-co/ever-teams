import React, { FC } from "react"
import { View, Image, StyleSheet, TouchableOpacity, Dimensions } from "react-native"
import { Feather } from '@expo/vector-icons';
import HeaderTimer from "./HeaderTimer";
import { useAppTheme } from "../app";

interface Props {
  showTimer: boolean,
  props: any
}

const { width } = Dimensions.get("window");
const HomeHeader: FC<Props> = ({ props, showTimer }) => {
  const { colors, dark } = useAppTheme();
  return (
    <View style={[styles.mainContainer, { backgroundColor: dark ? colors.background2 :colors.background }]}>
      <View style={[styles.secondContainer, { backgroundColor: dark ? colors.background2 :colors.background }]}>
        {dark ?
          <Image style={styles.logo} source={require("../../assets/images/new/gauzy-teams-white.png")} resizeMode="contain" /> :
          <Image style={styles.logo} source={require("../../assets/images/new/gauzy-teams.png")} resizeMode="contain" />
        }
        {showTimer &&
          <View style={{ width: 126 }}>
            <HeaderTimer />
          </View>
        }
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => props.navigation.openDrawer()}
        >
          <Feather name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    paddingHorizontal: 25,
    paddingVertical: 20,
    shadowColor: "rgba(0, 0, 0, 0.7)",
    shadowOffset: {
      width: 1,
      height: 3,
    },
    shadowOpacity: 0.07,
    shadowRadius: 1.00,
    elevation: 1,
  },
  secondContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 15
  }
})

export default HomeHeader
