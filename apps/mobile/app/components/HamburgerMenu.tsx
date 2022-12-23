import React, { useState } from "react"
import { View, StyleSheet, Image, TouchableOpacity, Dimensions } from "react-native"
import { AntDesign, Feather, FontAwesome5, MaterialIcons, SimpleLineIcons, Ionicons } from "@expo/vector-icons"
import { Switch, Title, Paragraph, Text, Drawer } from "react-native-paper"
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer"
import { useDrawerStatus } from '@react-navigation/drawer'
import { colors, typography } from "../theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "../models"
import DropDownSection from "./TeamDropdown/DropDownSection"
import DropDown from "./TeamDropdown/DropDown"
import CreateTeamModal from "../screens/Authenticated/TeamScreen/components/CreateTeamModal"
import ProfileImage from "./ProfileImage"




const HamburgerMenu = (props) => {
  const {
    TaskStore: { resetTeamTasksData },
    authenticationStore: { user, tenantId, organizationId, employeeId, authToken, logout, isAuthenticated },
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
    <View style={styles.container}>
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
          <Text style={styles.userProfileName}>{user?.name}</Text>
          <Text style={{ fontSize: 14, marginBottom: 20, fontFamily: typography.secondary.medium, marginTop: 4 }}>{user?.email}</Text>
          <DropDown onCreateTeam={() => setShowCreateTeamModal(true)} />

        </View>
        <View style={styles.navigationSection}>
          <TouchableOpacity style={{ flexDirection: "row", marginBottom: 30 }} onPress={() => navigation.navigate("Profile")}>
            <Image style={{ marginRight: 15 }} source={require("../../assets/icons/new/user.png")} />
            <Text style={styles.screenLabel}>My work</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ flexDirection: "row", marginBottom: 30 }} onPress={() => navigation.navigate("Team")}>
            <Image style={{ marginRight: 15 }} source={require("../../assets/icons/new/people.png")} />
            <Text style={styles.screenLabel}>Teams</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: "row", marginBottom: 30 }} onPress={() => navigation.navigate("Timer")}>
            <Image style={{ marginRight: 15 }} source={require("../../assets/icons/new/briefcase.png")} />
            <Text style={styles.screenLabel}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: "row", marginBottom: 17 }} onPress={() => navigation.navigate("")}>
            <Image style={{ marginRight: 15 }} source={require("../../assets/icons/new/setting-2.png")} />
            <Text style={styles.screenLabel}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.screenItem} onPress={() => navigation.navigate("")}>
            <View style={{ flexDirection: "row" }}>
              <Image style={{ marginRight: 15 }} source={require("../../assets/icons/new/moon.png")} />
              <Text style={styles.screenLabel}>Dark Mode</Text>
            </View>
            <Image style={{ top: 8, height: 50 }} source={require("../../assets/icons/new/toogle-light.png")} />
          </TouchableOpacity>
        </View>
      </DrawerContentScrollView>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={{ flexDirection: "row", justifyContent: "space-between", }} onPress={() => onLogout()}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={require("../../assets/icons/new/logout.png")} />
            <Text style={{ marginLeft: 10, color: "#DE437B", fontFamily: typography.primary.semiBold, fontSize: 16 }}>Log Out</Text>
          </View>
        </TouchableOpacity>
      </View>
      {isOpen ?
        <TouchableOpacity style={styles.close} onPress={() => navigation.closeDrawer()}>
          <Text>X</Text>
        </TouchableOpacity>
        : null
      }
    </View>
  )
}

const NavigationItem = (props) => {
  return (
    <View>

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
  profileImage: {
    borderRadius: 60,
    width: 120,
    height: 120,
    top: 2,
    alignSelf: 'center'
  },
  userProfileName: {
    fontSize: 20,
    color: colors.primary,
    fontFamily: typography.primary.semiBold,
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
  },
  screenLabel: {
    fontFamily: typography.secondary.medium,
    fontSize: 16,
    color: colors.primary
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
  }
})

export default HamburgerMenu;
