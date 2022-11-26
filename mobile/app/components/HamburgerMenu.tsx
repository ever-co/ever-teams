import React, { useState } from "react"
import { View, StyleSheet, Image, TouchableOpacity } from "react-native"
import { AntDesign, Feather, FontAwesome5, MaterialIcons, SimpleLineIcons } from "@expo/vector-icons"
import { Switch, Title, Paragraph, Text, Drawer } from "react-native-paper"
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer"
import { colors } from "../theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "../models"



const HamburgerMenu = (props) => {
  const navigation = useNavigation();

  const {
    authenticationStore: { logout, isAuthenticated },
    TaskStore:{resetTeamTasksData}
  } = useStores()

  const onToggleSwitch = () => {
    resetTeamTasksData()
    logout()
  }
  return (
    <View style={styles.container}>
      <DrawerContentScrollView style={{ width: '100%' }} {...props}>
        <View style={styles.headerIconsContainer}>
          <TouchableOpacity onPress={() => props.navigation.closeDrawer()}>
            <MaterialIcons name="keyboard-arrow-left" size={24} color="#1B005D" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Feather name="edit" size={24} color="#1B005D" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image resizeMode="contain" source={require("../../assets/images/Ruslan.png")} style={styles.profileImage} />
          </View>
          <Text style={styles.userProfileName}>Ruslan Konviser</Text>
          <Text>ruslan.k@everiq.com</Text>
        </View>
        <View style={styles.navigationSection}>
          <DrawerItem
            style={[styles.screenItem, { marginTop: 0 }]}
            icon={() => (
              <MaterialIcons name="work-outline" size={24} color="#1B005D" />
            )}
            label={"My work"}
            labelStyle={styles.screenLabel}
            onPress={() => props.navigation.navigate("Timer")}
          />
          <DrawerItem
            style={[styles.screenItem, { marginTop: 0 }]}
            icon={() => (
              <SimpleLineIcons name="people" size={24} color="#1B005D" />
            )}
            label={"Teams"}
            labelStyle={styles.screenLabel}
            onPress={() => props.navigation.navigate("Team")}
          />
          <DrawerItem
            style={[styles.screenItem, { marginTop: 0 }]}
            icon={() => (
              <FontAwesome5 name="tasks" size={24} color="#1B005D" />
            )}
            label={"Tasks"}
            labelStyle={styles.screenLabel}
            onPress={() => props.navigation.navigate("Profile")}
          />
          <DrawerItem
            style={[styles.screenItem, { marginTop: 0 }]}
            icon={() => (
              <Feather name="settings" size={24} color="#1B005D" />
            )}
            label={"Settings"}
            labelStyle={styles.screenLabel}
            onPress={() => { }}
          />

        </View>
      </DrawerContentScrollView>

      <View style={styles.bottomSection}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="exit-to-app" size={25} color="#1B005D" />
            <Text style={{ marginLeft: 10, color: "#1B005D", fontWeight: "700", fontSize: 17 }}>Logout</Text>
          </View>
          <Switch value={isAuthenticated} style={{ width: 50 }} onValueChange={onToggleSwitch} />
        </View>
      </View>
    </View>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10
  },
  navigationSection: {
    marginHorizontal: '15%',
    marginTop: 30
  },
  profileImage: {
    borderRadius: 60,
    width: 120,
    height: 120,
    top: 2,
    alignSelf: 'center'
  },
  userProfileName: {
    fontSize: 25,
    color: "#1B005D",
    marginTop: 15
  },
  profileImageContainer: {
    borderRadius: 60,
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.palette.neutral200
  },
  profileSection: {
    marginHorizontal: '15%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomColor: "#f4f4f4",
    borderBottomWidth: 1,
    paddingBottom: 30
  },
  bottomSection: {
    marginBottom: 25,
    marginHorizontal: "15%",
    paddingVertical: 10,
    borderTopColor: "#f4f4f4",
    borderTopWidth: 1,
  },
  screenItem: {
    marginTop: -10
  },
  screenLabel: {
    marginLeft: -25,
    fontSize: 16,
    color: '#1B005D'
  }
})

export default HamburgerMenu;
