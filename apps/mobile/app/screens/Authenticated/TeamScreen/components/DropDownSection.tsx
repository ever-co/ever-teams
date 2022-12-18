import React, { FC } from "react"
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"
import Icon from "react-native-vector-icons/Ionicons"
import { IOrganizationTeamList } from "../../../../services/interfaces/IOrganizationTeam"

export interface Props {
  teams: IOrganizationTeamList[]
  changeTeam:(value:IOrganizationTeamList)=>any
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

      <TouchableOpacity onPress={() => onCreateTeam()}>
        <View style={styles.buttonStyle}>
          {/* <Icon name="ios-book" color="#4F8EF7" /> */}
          <Text style={{ color: "#1B005D", fontSize: 18, fontWeight: "bold" }}>
            Create new team
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  )
}

export interface IDropItem {
  team: IOrganizationTeamList
  changeTeam:(value:IOrganizationTeamList)=>any
}

const DropItem:FC<IDropItem> = function CreateTeamModal({ team, changeTeam }) {
  return (
    <TouchableOpacity onPress={()=>changeTeam(team)} style={styles.indDropDown}>
      <Image style={styles.teamImage} source={require("../../../../../assets/icons/community.png")} />
      <Text style={{ color: "#1B005D", paddingLeft: "5%" }}>{team.name}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    elevation: 100,
    position: "absolute",
    top: 50,
    zIndex: 10,
    backgroundColor: "#fff",
    width: "80%",
    borderRadius: 10,
    justifyContent: "space-around",
  },
  indDropDown: {
    flexDirection: "row",
    paddingLeft: "10%",
    marginBottom:10
  },
  teamImage: {
    width: 25,
    height: 20,
    resizeMode: "stretch",
  },
  buttonStyle: {
    flexDirection: "row",
    backgroundColor: "#D7E1EB",
    borderRadius: 10,
    width: "80%",
    marginLeft: "10%",
    paddingTop: 5,
    paddingBottom: 5,
    marginBottom:10,
    justifyContent: "space-around",
    alignItems: "center",
  },
})

export default DropDownSection
