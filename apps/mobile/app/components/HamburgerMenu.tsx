import React, { useState } from "react"
import { View, StyleSheet, Image, TouchableOpacity, Dimensions } from "react-native"
import { AntDesign, Feather, FontAwesome5, MaterialIcons, SimpleLineIcons, Ionicons } from "@expo/vector-icons"
import { Text } from "react-native-paper"
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer"
import { useDrawerStatus } from '@react-navigation/drawer'
import { typography } from "../theme"
import { useStores } from "../models"
import DropDownSection from "./TeamDropdown/DropDownSection"
import DropDown from "./TeamDropdown/DropDown"
import CreateTeamModal from "./CreateTeamModal"
import ProfileImage from "./ProfileImage"
import { translate } from "../i18n"
import { useAppTheme } from "../app"
import { observer } from "mobx-react-lite"




const HamburgerMenu = (props) => {

  const { colors, dark } = useAppTheme()
  const {
    TaskStore: { resetTeamTasksData },
    authenticationStore: { user, tenantId, organizationId, employeeId, authToken, logout, toggleTheme },
    teamStore: { teams, activeTeam, activeTeamId, getUserTeams, createTeam, setActiveTeam, clearStoredTeamData },
    TaskStore: { teamTasks, activeTask, activeTaskId, setActiveTask }
  } = useStores()

  const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)

  const { navigation } = props;
  const isOpen = useDrawerStatus() === "open";

  // Create New Team
  const createNewTeam = async (text: string) => {
    const responseTeams = {
      tenantId: tenantId,
      organizationId: organizationId,
      access_token: authToken,
      employeeId,
      userId: user?.id,
      teamName: text
    };
    // createTeam(responseTeams)

  }

  const onLogout = () => {
    resetTeamTasksData()
    clearStoredTeamData()
    logout()
  }

  return (
    <View style={[styles.container, { backgroundColor: dark ? colors.background2 : colors.background }]}>
      <CreateTeamModal
        onCreateTeam={createNewTeam}
        visible={showCreateTeamModal}
        onDismiss={() => setShowCreateTeamModal(false)}
      />
      <DrawerContentScrollView style={{ width: '100%', }} {...props}>
        <View style={styles.profileSection}>
          <View style={{ marginBottom: 40 }}>
            <ProfileImage size={76} imageUrl={user?.imageUrl} />
          </View>
          <Text style={[styles.userProfileName, { color: colors.primary, marginTop: 30 }]}>{user?.name}</Text>
          <Text style={{ color: colors.tertiary, fontSize: 14, marginBottom: 20, fontFamily: typography.secondary.medium, marginTop: 4 }}>{user?.email}</Text>
          <DropDown resized={true} onCreateTeam={() => setShowCreateTeamModal(true)} />

        </View>
        <View style={styles.navigationSection}>
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("Timer")}>
            <Ionicons style={styles.icon} name="person" size={24} color={colors.primary} />
            <Text style={[styles.screenLabel, { color: colors.primary }]}>{translate("myWorkScreen.name")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("Team")}>
            <FontAwesome5 style={styles.icon} name="users" size={24} color={colors.primary} />
            <Text style={[styles.screenLabel, { color: colors.primary }]}>{translate("teamScreen.name")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("Profile", { userId: user?.id, tabIndex: 0 })}>
            <Ionicons style={styles.icon} name="ios-briefcase-outline" size={24} color={colors.primary} />
            <Text style={[styles.screenLabel, { color: colors.primary }]}>{translate("tasksScreen.name")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate("Setting")}>
            <Feather style={styles.icon} name="settings" size={24} color={colors.primary} />
            <Text style={[styles.screenLabel, { color: colors.primary }]}>{translate("settingScreen.name")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.screenItem} onPress={() => {
            toggleTheme()
            navigation.closeDrawer()
          }}>
            <View style={{ flexDirection: "row" }}>
              <Ionicons style={styles.icon} name="moon-outline" size={24} color={colors.primary} />
              <Text style={[styles.screenLabel, { color: colors.primary }]}>{translate("hamburgerMenu.darkMode")}</Text>
            </View>
            {dark ?
              <Image style={{}} source={require("../../assets/icons/new/toogle-dark.png")} /> :
              <Image style={{ top: 8, height: 50 }} source={require("../../assets/icons/new/toogle-light.png")} />}
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={{ flexDirection: "row", justifyContent: "space-between", }} onPress={() => onLogout()}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={require("../../assets/icons/new/logout.png")} />
            <Text style={{ marginLeft: 10, color: "#DE437B", fontFamily: typography.primary.semiBold, fontSize: 16 }}>{translate("common.logOut")}</Text>
          </View>
        </TouchableOpacity>
      </View>
      {isOpen ?
        <TouchableOpacity style={[styles.close, { backgroundColor: colors.background }]} onPress={() => navigation.closeDrawer()}>
          <Text style={{ color: colors.primary }}>X</Text>
        </TouchableOpacity>
        : null
      }
    </View>
  )
}


const { width, height } = Dimensions.get("window")
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20
  },
  headerIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navigationSection: {
    marginTop: 20,
    zIndex: 1,
    padding: 0
  },
  item: {
    flexDirection: "row",
    marginBottom: 30,
    alignItems: "center"
  },
  profileImage: {
    borderRadius: 60,
    width: 120,
    height: 120,
    top: 2,
    alignSelf: 'center'
  },
  userProfileName: {
    fontSize: 20,
    fontFamily: typography.primary.semiBold,
    marginTop: 15
  },
  profileImageContainer: {
    borderRadius: 60,
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    marginHorizontal: '1%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomColor: "rgba(0, 0, 0, 0.16)",
    borderBottomWidth: 1,
    paddingBottom: 10,
    zIndex: 10
  },
  bottomSection: {
    marginBottom: 37,
    paddingTop: 37,
    borderTopColor: "rgba(0, 0, 0, 0.16)",
    borderTopWidth: 1,
  },
  screenItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -10
  },
  screenLabel: {
    fontFamily: typography.secondary.medium,
    fontSize: 16,
    left: 15
  },
  close: {
    position: "absolute",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    left: -(width / 4),
    top: 66,
    zIndex: 1000
  },
  icon: { width: 30 }
})

export default HamburgerMenu;
