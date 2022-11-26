import React, { useCallback, useEffect, useState } from "react";
import { TextInput, TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons"
import { colors } from "../../../../theme/colors";
import { secondsToTime } from "../../../../helpers/date";
import { values } from "mobx";
import { useStores } from "../../../../models";


const EstimateTime = () => {
    const { 
        authenticationStore: { authToken, tenantId, organizationId },
        TaskStore: { activeTask, updateTask },
        teamStore:{activeTeamId}
 } = useStores();
    const [estimate, setEstimate] = useState({ hours: "", minutes: "" });
    const [validEstimate, setValidEstimate] = useState({ validHour: false, validMinute: false })
    const [editing, setEditing] = useState({ editingHour: false, editingMinutes: false })

    useEffect(() => {
        const { h, m } = secondsToTime(activeTask?.estimate || 0);
        setEstimate({
            hours: h.toString(),
            minutes: m.toString(),
        });
    }, [activeTask]);

    const onChangeHours = (value: string) => {
        const parsedQty = Number.parseInt(value)
        if (Number.isNaN(parsedQty)) {
            return
        } else if (parsedQty > 23) {
            setEstimate({
                ...estimate,
                hours: "23"
            })
            setValidEstimate({ ...validEstimate, validHour: true })
        } else {
            setEstimate({
                ...estimate,
                hours: parsedQty.toString()
            })
            setValidEstimate({ ...validEstimate, validHour: true })
        }
    }

    const onChangeMinutes = (value: string) => {
        const parsedQty = Number.parseInt(value)
        if (Number.isNaN(parsedQty)) {
            return
        } else if (parsedQty > 59) {
            setEstimate({
                ...estimate,
                minutes: "59"
            })
            setValidEstimate({ ...validEstimate, validMinute: true })
        } else {
            setEstimate({
                ...estimate,
                minutes: parsedQty.toString()
            })
            setValidEstimate({ ...validEstimate, validMinute: true })
        }
    }


    const handleSubmit = useCallback(() => {
        if (!activeTask) return;

        const hours = +estimate.hours;
        const minutes = +estimate.minutes;
        if (isNaN(hours) || isNaN(minutes) || (hours === 0 && minutes === 0)) {
            return;
        }

        const { h: estimateHours, m: estimateMinutes } = secondsToTime(
            activeTask.estimate || 0
        );

        if (hours === estimateHours && minutes === estimateMinutes) {
            return;
        }
        const task = {
            ...activeTask,
            estimate: hours * 60 * 60 + minutes * 60 // time seconds
        }

        const refreshData={
            activeTeamId,
            tenantId,
            organizationId
          }
            const response=updateTask({ taskData: task, taskId: task.id, authToken , refreshData});
            setEditing({ editingHour: false, editingMinutes: false })

    }, [activeTask, updateTask, estimate]);
// console.log(activeTask)
    return (
        <View style={[styles.estimate, {}]}>
            <TextInput
                maxLength={2}
                keyboardType={"numeric"}
                value={!editing.editingHour && estimate.hours}
                onFocus={() => setEditing({ ...editing, editingHour: true })}
                onEndEditing={() => setEditing({ ...editing, editingHour: false })}
                onChangeText={(text) => onChangeHours(text)}
                placeholder="Hh"
                style={styles.estimateInput}
            />
            <Text style={{ margin: 2 }}>:</Text>
            <TextInput
                maxLength={2}
                keyboardType={"numeric"}
                onFocus={() => setEditing({ ...editing, editingMinutes: true })}
                onEndEditing={() => setEditing({ ...editing, editingMinutes: false })}
                value={!editing.editingMinutes && estimate.minutes}
                placeholder="Mm"
                onChangeText={(text) => onChangeMinutes(text)}
                style={styles.estimateInput}
            />
            {validEstimate.validHour && validEstimate.validMinute ? (
                <TouchableOpacity style={styles.checkButton} onPress={() =>handleSubmit()}>
                    <Feather size={25} color={"green"} name="check" />
                </TouchableOpacity>
            ) : null}
        </View>
    )
}

export default EstimateTime;

const styles = StyleSheet.create({
    estimate: {
        // backgroundColor: "#E8EBF8"
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 3,
        alignItems: "center",
        borderRadius: 5,
        marginLeft: "auto",
        marginRight: 10,
        paddingHorizontal: 10,
    },
    estimateInput: {
        borderBottomColor: "gray",
        borderBottomWidth: 1,
        padding: 2,
    },
    checkButton: {
        margin: 2
    }
})