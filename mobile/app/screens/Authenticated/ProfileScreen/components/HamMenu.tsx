import React, { useState } from "react"
import { View, StyleSheet, Text, Image } from "react-native"
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons"
import { Switch } from "react-native-paper"

const HamMenu = () => {
  const [isSwitchOn, setIsSwitchOn] = React.useState(false)

  const onToggleSwitch = () => setIsSwitchOn(!isSwitchOn)
  return (
    <View style={styles.container}>
      <View style={styles.firstContainer}>
        <View style={styles.firstIcons}>
          <AntDesign name="left" size={15} color="black" />
          <Feather name="edit" size={15} color="black" />
        </View>
        <Image
          source={require("../../../../../assets/images/Ruslan.png")}
          style={styles.profileImage}
        />
        <View style={{ justifyContent: "flex-start" }}>
          <Text style={{ color: "#1B005D" }}>Ruslan Konviser</Text>
          <Text style={{ color: "#1B005D" }}>Ruslan.k@everiq.com</Text>
        </View>

        <View style={styles.line}></View>
        <View>
          <Twin icon={<MaterialIcons name="people-alt" size={15} color="#1B005D" />} text="Team" />
          <Twin
            icon={<MaterialIcons name="access-time" size={15} color="#1B005D" />}
            text="Timer"
          />
          <Twin
            icon={<MaterialIcons name="person-outline" size={15} color="#1B005D" />}
            text="Profile"
          />
          <Twin icon={<Feather name="settings" size={15} color="#1B005D" />} text="Settings" />
        </View>
        <View style={styles.line}></View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Twin icon={<MaterialIcons name="login" size={15} color="#1B005D" />} text="Logout" />
          <Switch value={isSwitchOn} onValueChange={onToggleSwitch} color="#1B005D" />
        </View>
      </View>
      <View style={styles.secondContainer}></View>
    </View>
  )
}

type ITwin = {
  icon: any
  text: string
}

const Twin = ({ icon, text }: ITwin) => (
  <View style={styles.twin}>
    {icon}
    <Text style={{ color: "#1B005D" }}>{text}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 10000000,
    width: "100%",
    height: "100%",
    flexDirection: "row",
  },
  firstContainer: {
    backgroundColor: "#fff",
    flex: 4,
    paddingVertical: 30,
    justifyContent: "space-around",
    alignItems: "center",
  },
  secondContainer: {
    flex: 1,
    backgroundColor: "#D9D9D9",
    opacity: 0.5,
  },
  profileImage: {
    borderRadius: 200,
    width: 120,
    height: 120,
  },
  firstIcons: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    alignSelf: "stretch",
  },
  twin: {
    flexDirection: "row",
    alignSelf: "stretch",
    alignItems: "center",
  },
  line: {
    backgroundColor: "#00000029",
    width: 150,
    height: 1,
  },
})

export default HamMenu
