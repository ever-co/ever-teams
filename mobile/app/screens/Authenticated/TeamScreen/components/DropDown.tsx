import React, { FC, useEffect, useState } from "react"
import { View, StyleSheet, TouchableOpacity, Text, Image } from "react-native"
import { useStores } from "../../../../models"
import { IOrganizationTeamCreate, IOrganizationTeamList } from "../../../../services/interfaces/IOrganizationTeam"
import DropDownSection from "./DropDownSection"

export interface Props {
  teams: IOrganizationTeamList[],
  total:number,
  onCreateTeam: () => unknown
}

const DropDown: FC<Props> = function CreateTeamModal({ teams, onCreateTeam, total}) {
  const { authenticationStore: { activeTeamIdState, setActiveTeamId, setActiveTeamState, activeTeamState } } = useStores();
  const [expanded, setExpanded] = useState(true)
  const handlePress = () => setExpanded(!expanded)
  const [showDrop, setShowDrop] = useState(false)
  const activeTeam: IOrganizationTeamList = activeTeamState;


  useEffect(() => {
    
  })

  const changeActiveTeam = (newActiveTeam: IOrganizationTeamList) => {
    setActiveTeamState(newActiveTeam);
    setActiveTeamId(newActiveTeam.id);
    setShowDrop(!showDrop)
  }
  
  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity
        style={styles.mainDropDown}
        activeOpacity={0.7}
        onPress={() => setShowDrop(!showDrop)}
      >
        <Image source={require("../../../../../assets/images/mask.png")} />
        <Text style={{ color: "#1B005D" }}>{`${activeTeam.name} (${!total ? 1: total})`}</Text>
        <Image source={require("../../../../../assets/icons/caretDown.png")} />
      </TouchableOpacity>
      {showDrop && <DropDownSection changeTeam={changeActiveTeam} teams={teams} onCreateTeam={onCreateTeam} />}

      {/* <List.Accordion
        style={styles.list}
        title="Uncontrolled Accordion"
        left={(props) => <List.Icon {...props} icon="folder" />}
      >
        <List.Item title="First item" />
        <List.Item title="Second item" />
      </List.Accordion> */}
      {/* <List.Section title="Accordions">
        <List.Accordion
          title="Uncontrolled Accordion"
          left={(props) => <List.Icon {...props} icon="folder" />}
        >
          <List.Item title="First item" />
          <List.Item title="Second item" />
        </List.Accordion>
      </List.Section> */}
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
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
