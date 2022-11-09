import React, { useState } from "react"
import { View, StyleSheet, Text, Image } from "react-native"
import { AntDesign, Feather, MaterialIcons, Entypo } from "@expo/vector-icons"
import { Switch } from "react-native-paper"

const HamMenu = () => {
  const [isSwitchOn, setIsSwitchOn] = React.useState(false)

  const onToggleSwitch = () => setIsSwitchOn(!isSwitchOn)
  return (
    <View style={styles.container}>
      <View style={styles.firstContainer}>
        <View>
          <AntDesign name="left" size={24} color="black" />
          <Feather name="edit" size={24} color="black" />
        </View>
        <Image
          source={require("../../../../../assets/images/Ruslan.png")}
          style={styles.profileImage}
        />
        <Text>Ruslan Konviser</Text>
        <Text>Ruslan.k@everiq.com</Text>
        <View></View>
        <View>
          <Twin icon={<MaterialIcons name="people-alt" size={24} color="black" />} text="Team" />
          <Twin icon={<MaterialIcons name="access-time" size={24} color="black" />} text="Timer" />
          <Twin
            icon={<MaterialIcons name="person-outline" size={24} color="black" />}
            text="Profile"
          />
          <Twin icon={<Feather name="settings" size={24} color="black" />} text="Settings" />
        </View>
        <View></View>
        <View>
          <Twin icon={<Entypo name="login" size={24} color="black" />} text="Logout" />

          <Switch value={isSwitchOn} onValueChange={onToggleSwitch} />
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
  <View>
    {icon}
    <Text>{text}</Text>
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
    backgroundColor: "red",
    flex: 4,
  },
  secondContainer: {
    flex: 1,
    backgroundColor: "#fff",
    opacity: 0.3,
  },
  profileImage: {
    borderRadius: 200,
    width: 120,
    height: 120,
  },
})

export default HamMenu
