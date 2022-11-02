import React, { FC } from "react"
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native"
import Icon from "react-native-vector-icons/Ionicons"

export interface Props {
  teams: teamItem[]
  onCreateTeam: () => unknown
}

export interface teamItem {
  img: string
  title: string
}

const DropDownSection: FC<Props> = function CreateTeamModal({ teams, onCreateTeam }) {
  return (
    <View style={styles.mainContainer}>
      {teams.map((item, index) => (
        <DropItem key={index} {...item} />
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

const DropItem = ({ img, title }: teamItem) => {
  return (
    <View style={styles.indDropDown}>
      <Image style={styles.teamImage} source={require("../../../../../assets/icons/community.png")} />
      <Text style={{ color: "#1B005D", paddingLeft: "5%" }}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  mainContainer: {
    elevation: 10000,
    position: "absolute",
    top: 50,
    zIndex: 10,
    backgroundColor: "#fff",
    width: "80%",
    height: "500%",
    borderRadius: 10,
    justifyContent: "space-around",
  },
  indDropDown: {
    flexDirection: "row",
    paddingLeft: "10%",
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
    justifyContent: "space-around",
    alignItems: "center",
  },
})

export default DropDownSection
