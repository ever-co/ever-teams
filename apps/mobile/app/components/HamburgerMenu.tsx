import React, { useState } from "react"
import { View, StyleSheet, Image, TouchableOpacity } from "react-native"
import { AntDesign, Feather, FontAwesome5, MaterialIcons, SimpleLineIcons } from "@expo/vector-icons"
import { Switch, Title, Paragraph, Text, Drawer } from "react-native-paper"
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer"
import { colors } from "../theme"
import { useNavigation } from "@react-navigation/native"
import { useStores } from "../models"
import DropDownSection from "../screens/Authenticated/TeamScreen/components/DropDownSection"
import DropDown from "../screens/Authenticated/TeamScreen/components/DropDown"
import CreateTeamModal from "../screens/Authenticated/TeamScreen/components/CreateTeamModal"
import ProfileImage from "./ProfileImage"



const HamburgerMenu = (props) => {
  const navigation = useNavigation();

  const {
    TaskStore: { resetTeamTasksData },
    authenticationStore: { user, tenantId, organizationId, employeeId, authToken, logout, isAuthenticated },
    teamStore: { teams, activeTeam, activeTeamId, getUserTeams, createTeam, setActiveTeam, clearStoredTeamData },
    TaskStore: { teamTasks, activeTask, activeTaskId, setActiveTask }
  } = useStores()

  const [showCreateTeamModal, setShowCreateTeamModal] = React.useState(false)

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
    createTeam(responseTeams)

  }

  const onToggleSwitch = () => {
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
          <View style={{marginBottom:40}}>
          <ProfileImage imageUrl={user?.imageUrl}/>
          </View>
          <Text style={styles.userProfileName}>{user?.name}</Text>
          <Text style={{fontSize:12}}>{user?.email}</Text>
          <DropDown onCreateTeam={() => setShowCreateTeamModal(true)} />
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
    marginHorizontal: '1%',
    marginTop: 20,
    zIndex: 1
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
    marginHorizontal: '1%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomColor: "#f4f4f4",
    borderBottomWidth: 1,
    paddingBottom: 20,
    zIndex: 10
  },
  bottomSection: {
    marginBottom: 25,
    marginHorizontal: "7%",
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
