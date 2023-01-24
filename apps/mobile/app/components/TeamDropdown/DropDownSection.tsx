import React, { FC } from "react"
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam"

// STYLES
import { GLOBAL_STYLE as GS } from "../../../assets/ts/styles"
import { typography } from "../../theme"
import { imgTitle } from "../../helpers/img-title"
import { useStores } from "../../models"
import { translate } from "../../i18n"
import { useAppTheme } from "../../app"
import { Avatar } from "react-native-paper"
import { useOrganizationTeam } from "../../services/hooks/useOrganization"
import { observer } from "mobx-react-lite"
import { limitTextCharaters } from "../../helpers/sub-text"

export interface Props {
  teams: IOrganizationTeamList[]
  changeTeam: (value: IOrganizationTeamList) => any
  onCreateTeam: () => unknown;
  resized: boolean;
}


const DropDownSection: FC<Props> = function DropDownSection({ teams, onCreateTeam, changeTeam, resized }) {
  const { teamStore: { activeTeamId, activeTeam, setActiveTeam } } = useStores();

  const others = teams.filter((t) => t.id !== activeTeamId);

  const { colors } = useAppTheme();
  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background, shadowColor: "rgba(0, 0, 0, 0.12)" }]}>
      <View style={styles.indDropDown}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Avatar.Text style={styles.teamImage} size={30} label={imgTitle("ALL")} labelStyle={styles.prefix} />
          <Text style={{ color: colors.tertiary, paddingLeft: "5%", fontSize: 16, fontFamily: typography.primary.normal }}>{"ALL"}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {activeTeamId && <DropItem resized={resized} team={activeTeam} changeTeam={changeTeam} isActiveTeam={true} />}
      {others.map((item, index) => (
        <DropItem key={index} team={item} resized={resized} changeTeam={changeTeam} isActiveTeam={false} />
      ))}

      <TouchableOpacity style={{ width: "90%" }} onPress={() => onCreateTeam()}>
        <View style={[styles.buttonStyle, { backgroundColor: colors.background }]}>
          <Ionicons name="add" size={24} color={colors.secondary} />
          <Text style={{ color: colors.secondary, fontSize: 14, fontFamily: typography.primary.semiBold }}>
            {translate("teamScreen.createNewTeamButton")}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}

export interface IDropItem {
  team: IOrganizationTeamList,
  isActiveTeam: boolean
  changeTeam: (value: IOrganizationTeamList) => any
  resized: boolean;
}

const DropItem: FC<IDropItem> = observer(function DropItem({ team, changeTeam, isActiveTeam, resized }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.indDropDown}>
      <TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }} onPress={() => changeTeam(team)}>
        <Avatar.Text style={styles.teamImage} size={30} label={imgTitle(team.name)} labelStyle={styles.prefix} />
        <Text
          style={{ color: colors.primary, paddingLeft: "5%", fontSize: 16, fontFamily: isActiveTeam ? typography.primary.semiBold : typography.primary.normal }}
        >
          {limitTextCharaters({ text: team.name, numChars: resized ? 12 : 20 })} ({team.members.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity>
        <Ionicons name="settings-outline" size={24} color={colors.primary} />
      </TouchableOpacity>
    </View>
  )
})

const styles = StyleSheet.create({
  mainContainer: {
    elevation: 100,
    position: "absolute",
    top: 58,
    zIndex: 10,
    paddingTop: 10,
    left: 0,
    width: "100%",
    minWidth: 240,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    ...GS.shadow,
    shadowOffset: { width: 0, height: 10 }
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
    justifyContent: "center",
    alignItems: "center",
  },
  teamImage: {
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