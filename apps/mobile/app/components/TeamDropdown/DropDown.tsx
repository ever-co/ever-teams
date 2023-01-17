import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useState } from "react"
import { View, StyleSheet, TouchableOpacity, Text } from "react-native"
import { Avatar } from 'react-native-paper';
import { AntDesign } from "@expo/vector-icons"
import { useAppTheme } from "../../app"
import { imgTitle } from "../../helpers/img-title"
import { useStores } from "../../models"
import { IOrganizationTeamCreate, IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam"
import { typography } from "../../theme"
import DropDownSection from "./DropDownSection"
import { useOrganizationTeam } from "../../services/hooks/useOrganization";

export interface Props {
  onCreateTeam: () => unknown,
}

const DropDown: FC<Props> = observer(function CreateTeamModal({ onCreateTeam }) {
  const { colors } = useAppTheme();
  const {
    teamStore: { teams, setActiveTeamId, activeTeam, },
    TaskStore: { setActiveTask }
  } = useStores();

  const [expanded, setExpanded] = useState(true)
  const handlePress = () => setExpanded(!expanded)
  const [showDrop, setShowDrop] = useState(false)



  const changeActiveTeam = (newActiveTeam: IOrganizationTeamList) => {
    setActiveTeamId(newActiveTeam.id)
    setShowDrop(!showDrop)
    setActiveTask({})
  }

  return (
    <View style={[styles.mainContainer,]}>
      <TouchableOpacity
        style={[styles.mainDropDown, { backgroundColor: colors.background, borderColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => setShowDrop(!showDrop)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Avatar.Text style={styles.teamImage} size={40} label={imgTitle(activeTeam.name)} labelStyle={styles.prefix} />
          <Text style={[styles.activeTeamTxt, { color: colors.primary }]}>{`${activeTeam.name} (${activeTeam.members.length})`}</Text>
        </View>
        {showDrop ?
          <AntDesign name="up" size={24} color={colors.primary} /> :
          <AntDesign name="down" size={24} color={colors.primary} />
        }
      </TouchableOpacity>
      {showDrop && <DropDownSection changeTeam={changeActiveTeam} teams={teams.items} onCreateTeam={onCreateTeam} />}
    </View >
  )
})

const styles = StyleSheet.create({
  mainContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    width: "100%"
  },
  mainDropDown: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    height: 56,
    borderWidth: 1
  },
  teamImage: {
    backgroundColor: "#C1E0EA",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1.5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 2,
  },
  activeTeamTxt: {
    fontWeight: "600",
    fontSize: 14,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold,
    left: 12
  },
  prefix: {
    fontSize: 14,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold,
    fontWeight: "600"
  }
})

export default DropDown
