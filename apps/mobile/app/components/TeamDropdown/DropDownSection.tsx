import React, { FC } from "react"
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"
import Icon from "react-native-vector-icons/Ionicons"
import { IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../assets/ts/styles"
import { colors, typography } from "../../theme"
import { imgTitle } from "../../helpers/img-title"

export interface Props {
  teams: IOrganizationTeamList[]
  changeTeam: (value: IOrganizationTeamList) => any
  onCreateTeam: () => unknown
}

// export interface teamItem {
//   img: string
//   title: string
// }

const DropDownSection: FC<Props> = function CreateTeamModal({ teams, onCreateTeam, changeTeam }) {
  return (
    <View style={styles.mainContainer}>
      {teams.map((item, index) => (
        <DropItem key={index} team={item} changeTeam={changeTeam} />
      ))}

      <TouchableOpacity style={{ width: "90%" }} onPress={() => onCreateTeam()}>
        <View style={styles.buttonStyle}>
          {/* <Icon name="ios-book" color="#4F8EF7" /> */}
          <Text style={{ color: colors.primary, fontSize: 18, }}>
            Create new team
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}

export interface IDropItem {
  team: IOrganizationTeamList
  changeTeam: (value: IOrganizationTeamList) => any
}

const DropItem: FC<IDropItem> = function CreateTeamModal({ team, changeTeam }) {
  return (
    <View style={styles.indDropDown}>
      <TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }} onPress={() => changeTeam(team)}>
        <View style={styles.teamImage}>
          <Text style={styles.prefix}>{imgTitle(team.name)}</Text>
        </View>
        <Text style={{ color: colors.primary, paddingLeft: "5%", fontSize: 16 }}>{team.name} ({team.members.length})</Text>
      </TouchableOpacity>
      <TouchableOpacity>
        <Image resizeMode="contain" source={require("../../../assets/icons/new/setting-2.png")} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    elevation: 100,
    position: "absolute",
    top: 58,
    zIndex: 10,
    paddingTop: 10,
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    ...GS.shadow
  },
  indDropDown: {
    flexDirection: "row",
    width: "90%",
    alignItems: "center",
    marginVertical: 10,
    justifyContent: "space-between"
  },
  buttonStyle: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#3826A6",
    height: 44,
    borderRadius: 10,
    width: "100%",
    paddingTop: 5,
    paddingBottom: 5,
    marginBottom: 10,
    marginTop: 10,
    justifyContent: "space-around",
    alignItems: "center",
  },
  teamImage: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    backgroundColor: "#C1E0EA",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1.5,
    }
  },
  prefix: {
    fontSize: 14,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold,
    fontWeight: "600"
  }
})

export default DropDownSection
