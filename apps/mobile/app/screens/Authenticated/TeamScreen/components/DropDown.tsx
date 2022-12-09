import { observer } from "mobx-react-lite"
import React, { FC, useEffect, useState } from "react"
import { View, StyleSheet, TouchableOpacity, Text, Image } from "react-native"
import { useStores } from "../../../../models"
import { IOrganizationTeamCreate, IOrganizationTeamList } from "../../../../services/interfaces/IOrganizationTeam"
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
    setTeamInvitations({items:[], total:0})
  }

  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity
        style={styles.mainDropDown}
        activeOpacity={0.7}
        onPress={() => setShowDrop(!showDrop)}
      >
        <Image source={require("../../../../../assets/images/mask.png")} />
        <Text style={{ color: "#1B005D" }}>{`${activeTeam.name} (${teams.total})`}</Text>
        <Image source={require("../../../../../assets/icons/caretDown.png")} />
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
    marginTop: 10,
    zIndex:999
  },
  mainDropDown: {
    flexDirection: "row",
    width: "80%",
    backgroundColor: "#E8EBF8",
    justifyContent: "space-around",
    borderRadius: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
})

export default DropDown
