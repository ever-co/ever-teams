import React, { FC, useEffect, useState } from "react"
import { Text, View, StyleSheet, TextInput, Image, TouchableOpacity } from "react-native"
import { ProgressBar } from "react-native-paper"
import { colors, typography } from "../theme"

import { GLOBAL_STYLE as GS } from "../../assets/ts/styles"
import { useStores } from "../models"
import { ITeamTask } from "../services/interfaces/ITask"
import { observer } from "mobx-react-lite"
import { pad } from "../helpers/number"
import { useTimer } from "../services/hooks/useTimer"
import { convertMsToTime } from "../helpers/date"

export interface Props {
}

const TimerCard: FC<Props> = observer(() => {
  const {
    authenticationStore: { tenantId, organizationId, authToken },
    teamStore: { activeTeamId, activeTeam },
    TaskStore: { setActiveTask, activeTask, fetchingTasks },
    TimerStore: { localTimerStatus, timeCounterState }
  } = useStores();
  const {
    startTimer,
    stopTimer,
    getTimerStatus,
    fomatedTimeCounter: { hours, minutes, seconds, ms_p },
    canRunTimer,
  } = useTimer();
  const [showCombo, setShowCombo] = useState(false)
  const [taskInputText, setTaskInputText] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showCheckIcon, setShowCheckIcon] = useState<boolean>(false)



  const handleChangeText = (value: string) => {
    setTaskInputText(value)
    if (value.trim().length > 0) {
      setShowCombo(true)
      setShowCheckIcon(false)
    } else {
      setShowCombo(false)
    }

    if (value.trim().length >= 3) {
      setShowCheckIcon(true)
    }
  }


  const getTimePercentage = () => {
    if (activeTask) {
      if (!activeTask.estimate) {
        return 0;
      }
      // convert milliseconds to seconds
      const seconds = timeCounterState / 1000
      return seconds / activeTask.estimate
    } else {
      return 0
    }
  }


  useEffect(() => {
    handleChangeText("")
  }, [activeTeam])


  return (
    <View style={styles.mainContainer}>
      <View style={styles.horizontal}>
        <View style={{ justifyContent: "space-around" }}>
          <Text style={styles.timerText}>{pad(hours)}:{pad(minutes)}:{pad(seconds)}<Text style={{ fontSize: 14 }}>:{pad(ms_p)}</Text></Text>
          <ProgressBar style={{ backgroundColor: "#E9EBF8", width: "84%", height: 6, borderRadius: 3 }} progress={getTimePercentage()} color={activeTask && activeTask.estimate > 0 ? "#27AE60" : "#F0F0F0"} />
        </View>
        <View style={styles.timerBtn}>
          {!localTimerStatus.running ? (
            <TouchableOpacity activeOpacity={canRunTimer ? 1 : 0.4} style={[styles.timerBtnInactive, { backgroundColor: "#fff", opacity: canRunTimer ? 1 : 0.4 }]} onPress={() => { canRunTimer ? startTimer() : {} }}>
              <Image resizeMode="contain" style={[styles.timerIcon,]} source={require("../../assets/icons/new/play.png")} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => stopTimer()}>
              <Image resizeMode="contain" source={require("../../assets/images/new/pause-icon.png")} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View >
  )
})

const styles = StyleSheet.create({
  mainContainer: {
    width: "100%",
    borderTopColor: "rgba(0, 0, 0, 0.06)",
    borderTopWidth: 1,
    paddingTop: 20,
    zIndex: 998
  },
  timerBtn: {
    marginLeft: 5,
    paddingLeft: -5,
    marginVertical: 4,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(0, 0, 0, 0.08)",
    width: 100
  },
  estimate: {
    color: "#9490A0",
    fontWeight: "600",
    fontSize: 12,
    marginBottom: 10,
    alignSelf: "flex-end",
  },
  working: {
    color: "#9490A0",
    fontWeight: "600",
    marginBottom: 10,
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    height: 60,
  },
  textInput: {
    color: colors.primary,
    width: '85%',
    height: '90%'
  },
  textInputOne: {
    height: 30,
  },
  horizontalInput: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  dashed: {
    borderBottomColor: "#fff",
    borderBottomWidth: 10,
  },
  separator: {
    backgroundColor: colors.border,
    width: 2,
    marginHorizontal: 5,
    transform: [{ rotate: "20deg" }],
    height: 20,
  },
  wrapInput: {
    backgroundColor: "#EEEFF5",
    height: 50,
    width: "100%",
    borderRadius: 10,
    marginBottom: 6,
  },
  loading: {
    position: 'absolute',
    right: 10,
    top: 15
  },
  timerText: {
    fontWeight: "600",
    fontSize: 35,
    color: "#1B005D",
    fontFamily: typography.fonts.PlusJakartaSans.semiBold
  },
  timerIcon: {
    width: 21,
    height: 21
  },
  timerBtnInactive: {
    width: 60,
    height: 60,
    backgroundColor: "#3826A6",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    ...GS.shadow
  }
})

export default TimerCard
