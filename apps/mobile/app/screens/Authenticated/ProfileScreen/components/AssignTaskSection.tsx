import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles";
import { Button, Card } from "../../../../components";
import ManageTaskCard from "../../../../components/ManageTaskCard";
import { colors } from "../../../../theme";
import NewTimerCard from "../../TimerScreen/components/NewTimerCard";

const AssignTaskSection = () => {
    const [assignClicked, setAssignClicekd] = React.useState(false);
    return (
        <View style={styles.container}>
            {!assignClicked ? (
                <Button
                    preset="default"
                    textStyle={{ color: colors.palette.neutral100, fontWeight: "bold", fontSize: 12 }}
                    style={{
                        width: "40%",
                        ...GS.bgTransparent,
                        ...GS.mb2,
                        borderRadius:10,
                        borderColor: colors.primary,
                        backgroundColor: colors.primary,
                    }}
                    onPress={() => setAssignClicekd(true)}
                >
                    Assign Task
                </Button>
            ) : (
                <View style={{
                    elevation:5,
                    backgroundColor:"#fff",
                    width:"100%",
                    paddingHorizontal:20,
                    paddingVertical:10,
                    borderRadius:10,
                }}>
                    <Text style={{alignSelf:"center",margin:5}}>Assign Task</Text>
                    <ManageTaskCard />
                </View>
            )}
        </View>
    )
}

export default AssignTaskSection;

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.palette.neutral200,
        width: "100%",
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex:1000
    },
    assignBtn: {
        backgroundColor: "#1B005D",
        width: "40%",
        padding: 10,
        borderRadius: 8,
        alignItems: 'center'
    },
    assignTxt: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 12
    }
})