import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useState } from "react"
import { View, StyleSheet, TouchableOpacity, Text, Image } from "react-native"
import { imgTitle } from "../../helpers/img-title"
import { useStores } from "../../models"
import { IOrganizationTeamCreate, IOrganizationTeamList } from "../../services/interfaces/IOrganizationTeam"
import { typography } from "../../theme"
import DropDownSection from "./DropDownSection"

export interface Props {
  onCreateTeam: () => unknown
}

const DropDown: FC<Props> = observer(function CreateTeamModal({ onCreateTeam }) {
  const {
    authenticationStore: { tenantId, organizationId, authToken },
    teamStore: { teams, setActiveTeam, activeTeamId, activeTeam, setTeamInvitations },
    TaskStore: { setActiveTask, getTeamTasks }
  } = useStores();

  const [expanded, setExpanded] = useState(true)
  const handlePress = () => setExpanded(!expanded)
  const [showDrop, setShowDrop] = useState(false)



  useEffect(() => {
  })

  const changeActiveTeam = (newActiveTeam: IOrganizationTeamList) => {
    setActiveTeam(newActiveTeam)
    getTeamTasks({ authToken, organizationId, tenantId, activeTeamId: newActiveTeam.id })
    setShowDrop(!showDrop)
    setActiveTask({})
    setTeamInvitations({ items: [], total: 0 })
  }


  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity
        style={styles.mainDropDown}
        activeOpacity={0.7}
        onPress={() => setShowDrop(!showDrop)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.teamImage}>
            <Text style={styles.prefix}>{imgTitle(activeTeam.name)}</Text>
          </View>
          <Text style={styles.activeTeamTxt}>{`${activeTeam.name} (${teams.total})`}</Text>
        </View>
        <Image source={require("../../../assets/icons/caretDown.png")} />
      </TouchableOpacity>
      {showDrop && <DropDownSection changeTeam={changeActiveTeam} teams={teams.items} onCreateTeam={onCreateTeam} />}
    </View>
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
    backgroundColor: "#FFF",
    justifyContent: "space-between",
    alignItems: 'center',
    borderRadius: 10,
    borderColor: "#DCE4E8",
    paddingVertical: 10,
    paddingHorizontal: 10,
    height: 56,
    borderWidth: 1
  },
  teamImage: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
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
    color: "#282048",
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
