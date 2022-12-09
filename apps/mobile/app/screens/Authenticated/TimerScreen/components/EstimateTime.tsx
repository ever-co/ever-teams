import React, { useCallback, useEffect, useState } from "react";
import { TextInput, TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons"
import { colors } from "../../../../theme/colors";
import { secondsToTime } from "../../../../helpers/date";
import { values } from "mobx";
import { useStores } from "../../../../models";
import { ActivityIndicator } from "react-native-paper";

interface params{
    setEditEstimate?:(value:boolean)=>unknown
}
const EstimateTime = ({setEditEstimate}:params) => {
    const {
        authenticationStore: { authToken, tenantId, organizationId },
        TaskStore: { activeTask, updateTask, fetchingTasks },
        teamStore: { activeTeamId }
    } = useStores();
    const [estimate, setEstimate] = useState({ hours: "", minutes: "" });
    const [editing, setEditing] = useState({ editingHour: false, editingMinutes: false })
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [showCheckIcon, setShowCheckIcon] = useState<boolean>(false)

    useEffect(() => {
        const { h, m } = secondsToTime(activeTask?.estimate || 0);
        setEstimate({
            hours: h.toString(),
            minutes: m.toString(),
        });
        setShowCheckIcon(false)
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
        } else {
            setEstimate({
                ...estimate,
                hours: parsedQty.toString()
            })
        }
        handleCheckIcon();
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
        } else {
            setEstimate({
                ...estimate,
                minutes: parsedQty<10 ? "0"+parsedQty.toString() :parsedQty.toString()
            })
        }
        handleCheckIcon();
    }

    const handleCheckIcon = () => {
        const intHour = Number.parseInt(estimate.hours);
        const intMinutes = Number.parseInt(estimate.minutes);
        if (estimate.hours!=="" && estimate.minutes!=="") {
            const seconds=intHour * 60 * 60 + intMinutes * 60
            setShowCheckIcon(seconds>0?true:false)
        }
    }


    const handleSubmit = useCallback(async() => {
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

        const refreshData = {
            activeTeamId,
            tenantId,
            organizationId
        }
        setShowCheckIcon(false)
        setIsLoading(true)
        const response = await updateTask({ taskData: task, taskId: task.id, authToken, refreshData });
        setEditing({ editingHour: false, editingMinutes: false })
        setIsLoading(false)
        setEditEstimate(false)
    }, [activeTask, updateTask, estimate]);

    return (
        <View style={[styles.estimate, {}]}>
            <TextInput
                maxLength={2}
                keyboardType={"numeric"}
                value={!editing.editingHour && estimate.hours}
                onFocus={() => setEditing({ ...editing, editingHour: true })}
                onEndEditing={() => setEditing({ ...editing, editingHour: false })}
                onChangeText={(text) => onChangeHours(text)}
                style={[styles.estimateInput,estimate.hours.length!==0 && {borderBottomColor:"white"}]}
            />
            <Text>h</Text>
            <Text style={{ margin: 2 }}>:</Text>
            <TextInput
                maxLength={2}
                keyboardType={"numeric"}
                onFocus={() => setEditing({ ...editing, editingMinutes: true })}
                onEndEditing={() => setEditing({ ...editing, editingMinutes: false })}
                value={!editing.editingMinutes && estimate.minutes}
                onChangeText={(text) => onChangeMinutes(text)}
                style={[styles.estimateInput,estimate.minutes.length>0 && {borderBottomColor:"white"}]}
            />
            <Text>m</Text>
            {showCheckIcon && <Feather style={styles.thickIconStyle} size={25} color={"green"} name="check" onPress={() => handleSubmit()} />}
            {isLoading ? <ActivityIndicator size={14} color="#1B005D" style={styles.loading} /> : null}
        </View>
    )
}

export default EstimateTime;

const styles = StyleSheet.create({
    estimate: {
        // backgroundColor: "#E8EBF8",
        flexDirection: "row",
        justifyContent: "space-between",
        // padding: 3,
        alignItems: "center",
        borderRadius: 8,
        marginLeft: "auto",
        marginRight: 10,
    },
    estimateInput: {
        borderBottomColor: "gray",
        borderBottomWidth: 1,
        textAlign:"center",
    },
    checkButton: {
        margin: 2
    },
    loading: {
        position: 'absolute',
        right:-18,
    },
    thickIconStyle:{
        position:"absolute",
        right:-23
    }
})