import React, { useEffect, useMemo, useState } from "react"
import {
  View,
  ViewStyle,
  Image,
  ImageStyle,
  TouchableNativeFeedback,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Dimensions
} from "react-native"
import { AntDesign } from '@expo/vector-icons';

// COMPONENTS
import { Card, Icon, ListItem, Text } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { colors, spacing, typography } from "../../../../theme"
import ProgressTimeIndicator from "../../TeamScreen/components/ProgressTimeIndicator"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import EstimateTime from "../../TimerScreen/components/EstimateTime"
import { useStores } from "../../../../models";
import { ActivityIndicator } from "react-native-paper";
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization";
import { IUser } from "../../../../services/interfaces/IUserData";
import { useTimer } from "../../../../services/hooks/useTimer";
import { pad } from "../../../../helpers/number";
import { useTeamTasks } from "../../../../services/hooks/features/useTeamTasks";
import WorkedDayHours from "../../../../components/WorkedDayHours";
import WorkedOnTask from "../../../../components/WorkedOnTask";
import TaskStatus from "./TaskStatus";

export type ListItemProps = {
  item: ITeamTask
  onPressIn?: () => unknown
  handleEstimate?: () => unknown,
  onAssignTask?: (taskId: string) => unknown,
  onUnassignTask?: (taskId: string) => unknown,
  isActive: boolean,
  tabIndex: number,
  enableEstimate?: boolean
  enableEditTaskTitle?: boolean,
  handleTaskTitle?: () => unknown,
  member: IUser,
  index: number,
}

export interface Props extends ListItemProps { }

const { width, height } = Dimensions.get("window")

export const ListItemContent: React.FC<ListItemProps> = (props) => {
  const {
    authenticationStore: { authToken, tenantId, organizationId, user },
    teamStore: { activeTeamId },
    TaskStore: { activeTask },
    TimerStore: {
      timeCounterState, localTimerStatus
    } } = useStores();
  const { item, enableEditTaskTitle, enableEstimate, handleEstimate, handleTaskTitle, onPressIn, isActive, tabIndex, onAssignTask, member } = props;

  const {
    startTimer,
    stopTimer,
    getTimerStatus,
    toggleTimer,
    fomatedTimeCounter: { hours, minutes, seconds, ms_p },
    timerStatusFetchingState,
    canRunTimer,
  } = useTimer();

  const { updateTask } = useTeamTasks();

  const [titleInput, setTitleInput] = useState("")
  const [loading, setLoading] = useState(false);
  const [memberTask, setMemberTask] = useState<ITeamTask | null>(item)
  const isAuthUser = member.employee.userId === user?.id;

  useEffect(() => {
    if (isAuthUser && isActive) {
      setMemberTask(activeTask);
    }
  }, [isAuthUser, activeTask, member])

  const onChangeTaskTitle = async () => {
    const task: ITeamTask = {
      ...item,
      title: titleInput
    };
    setLoading(true)
    await updateTask(task, task?.id);
    setLoading(false)
    handleTaskTitle()
  }

  const isAnAssignedTask = useMemo(() => {
    const exist = item.members.find((m) => m.userId === member.id)
    return !!exist
  }, [item, member])



  return (
    <TouchableNativeFeedback onPressIn={onPressIn}>
      <View style={{ ...GS.p4, ...GS.positionRelative }}>
        <View>
          <WorkedOnTask
            memberTask={memberTask}
            isAuthUser={isAuthUser}
            title={"Total time"}
            containerStyle={{ flexDirection: "row", alignItems: "center" }}
          />
        </View>

        <View style={styles.firstContainer}>
          <View style={{}}>
            <TouchableOpacity onLongPress={() => handleTaskTitle()}>
              <TextInput
                style={[styles.otherText, enableEditTaskTitle ? styles.titleEditMode : null]}
                defaultValue={enableEditTaskTitle ? titleInput : memberTask.title}
                editable={enableEditTaskTitle}
                multiline={true}
                numberOfLines={2}
                onChangeText={(text) => setTitleInput(text)}
              />
              {titleInput !== item.title && titleInput.trim().length > 3 && enableEditTaskTitle && !loading ?
                <AntDesign style={styles.checkBtn} name="check" size={24} onPress={() => onChangeTaskTitle()} color="green" />
                : null
              }
              {loading && <ActivityIndicator style={styles.checkBtn} />}
            </TouchableOpacity>
          </View>
          {/* ENABLE ESTIMATE INPUTS */}
          {enableEstimate ? (
            <View style={styles.estimate}>
              <EstimateTime setEditEstimate={handleEstimate} currentTask={memberTask} />
            </View>
          ) : (
            <View style={{ right: -5, top: -5 }}>
              <TouchableOpacity onPress={() => handleEstimate()}>
                <ProgressTimeIndicator
                  estimatedHours={memberTask.estimate}
                  workedHours={isActive && isAuthUser ? timeCounterState : 0}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.times}>
          <View style={{ flexDirection: "row", width: "50%", alignItems: "center" }}>
            {isAuthUser ? (
              <>
                {activeTask.id === item.id ? (
                  <>
                    {localTimerStatus.running ?
                      <TouchableOpacity style={[styles.timerBtn]} onPress={() => stopTimer()}>
                        <Image resizeMode="contain" style={[styles.timerIcon,]} source={require("../../../../../assets/icons/new/stop.png")} />
                      </TouchableOpacity>
                      :
                      <TouchableOpacity style={[styles.timerBtn, { backgroundColor: "#fff" }]} onPress={() => startTimer()}>
                        <Image resizeMode="contain" style={[styles.timerIcon,]} source={require("../../../../../assets/icons/new/play.png")} />
                      </TouchableOpacity>
                    }
                    <View style={{ justifyContent: "center", alignItems: "center" }}>
                      <Text style={styles.timeHeading}>Today work</Text>
                      <Text style={styles.timeNumber}>{pad(hours)} h:{pad(minutes)} m</Text>
                    </View>
                  </>
                )
                  :
                  <>
                    <TouchableOpacity style={[styles.timerBtn, { backgroundColor: "#fff" }]}>
                      <Image resizeMode="contain" style={[styles.timerIcon,]} source={require("../../../../../assets/icons/new/play.png")} />
                    </TouchableOpacity>
                    <View style={{ justifyContent: "center", alignItems: "center" }}>
                      <Text style={styles.timeHeading}>Today work</Text>
                      <Text style={styles.timeNumber}>{pad(hours)} h:{pad(minutes)} m</Text>
                    </View>
                  </>
                }
              </>
            ) : (
              <>
                {!isAnAssignedTask ? (
                  <TouchableOpacity style={[styles.timerBtn, { backgroundColor: "#fff" }]} onPress={() => onAssignTask(item.id)}>
                    <Image resizeMode="contain" style={[styles.timerIcon,]} source={require("../../../../../assets/icons/new/arrow-right.png")} />
                  </TouchableOpacity>
                ) : null}
                <View style={{ left: 12, justifyContent: "center", alignItems: "center" }}>
                  <Text style={styles.timeHeading}>Assigned by</Text>
                  <Text style={styles.timeNumber}>8 people</Text>
                </View>
              </>
            )}



          </View>
          <View style={{ width: 133, height: 33 }}>
            <TaskStatus {...item} />
          </View>
        </View>
      </View>
    </TouchableNativeFeedback >
  )
}


const ListCardItem: React.FC<Props> = (props) => {
  const { isTeamManager } = useOrganizationTeam();
  // STATS
  const [showMenu, setShowMenu] = React.useState(false)
  const [estimateNow, setEstimateNow] = React.useState(false)
  const [editTaskTitle, setEditTaskTitle] = React.useState(false)

  const handleEstimate = () => {
    setEstimateNow(!estimateNow)
    setShowMenu(false)
  }
  const handleTaskTitle = () => {
    setEditTaskTitle(!editTaskTitle)
    setShowMenu(false)
  }


  const { index, onAssignTask, onUnassignTask, member, isActive, item } = props;
  const iuser = member.employee.user

  return (
    <Card
      style={[{
        ...$listCard,
        ...GS.mb3,
        zIndex: 0,
      }, isActive ? { borderColor: "#8C7AE4", borderWidth: 3 } : null]}
      HeadingComponent={
        <View
          style={{
            ...GS.positionAbsolute,
            ...GS.t0,
            ...GS.r0,
            ...GS.mr3,
            ...GS.pt2,
            ...GS.zIndexFront,
          }}
        >
          <View
            style={{
              ...GS.positionRelative,
            }}
          >
            <View
              style={{
                ...GS.positionAbsolute,
                ...GS.p2,
                ...GS.pt1,
                ...GS.shadow,
                ...GS.r0,
                ...GS.roundedSm,
                ...GS.zIndexFront,
                width: 172,
                marginTop: -spacing.extraSmall,
                marginRight: 17,
                backgroundColor: colors.background,
                minWidth: spacing.huge * 2,
                ...(!showMenu ? { display: "none" } : {}),
              }}
            >
              <View style={{}}>
                <ListItem textStyle={styles.dropdownTxt} onPress={() => handleTaskTitle()}>Edit Task</ListItem>
                <ListItem textStyle={styles.dropdownTxt} onPress={() => handleEstimate()}>Estimate</ListItem>
                {onAssignTask && <ListItem textStyle={styles.dropdownTxt}
                  onPress={() => {
                    onAssignTask(item.id)
                    setShowMenu(!showMenu)
                  }}
                >Assign Task</ListItem>}

                {onUnassignTask && <ListItem textStyle={styles.dropdownTxt}
                  onPress={() => {
                    onUnassignTask(item.id)
                    setShowMenu(!showMenu)
                  }}>Unassign Task</ListItem>}
              </View>
            </View>

            <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
              <Icon icon={showMenu ? "x" : "VMore"} />
            </TouchableOpacity>
          </View>
        </View>
      }
      ContentComponent={
        <ListItemContent
          {...props}
          handleEstimate={handleEstimate}
          enableEstimate={estimateNow}
          enableEditTaskTitle={editTaskTitle}
          handleTaskTitle={handleTaskTitle}
          onPressIn={() => {
            setShowMenu(false)
            setEditTaskTitle(false)
            setEstimateNow(false)
            if (typeof props?.onPressIn === "function") {
              props.onPressIn()
            }
          }}
        />
      }
    />
  )
}

export default ListCardItem

const $listCard: ViewStyle = {
  ...GS.flex1,
  ...GS.p0,
  borderRadius: 14,
  ...GS.noBorder,
  ...GS.shadow,
  minHeight: 188,
}

const $usersProfile: ImageStyle = {
  ...GS.roundedFull,
  backgroundColor: colors.background,
  width: spacing.huge - spacing.tiny,
  height: spacing.huge - spacing.tiny,
}

const styles = StyleSheet.create({
  mainContainer: {
    borderColor: "#1B005D",
    borderWidth: 0.5,
    borderRadius: 20,
    justifyContent: "space-around",
  },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.06)",
  },
  otherText: {
    fontSize: 14,
    color: colors.primary,
    fontFamily: typography.primary.semiBold,
    width: width / 1.7,
    lineHeight: 15,
    marginVertical: 15,
  },
  titleEditMode: {
    minWidth: 220,
    height: 40,
    borderColor: colors.primary,
    borderWidth: 0.3,
    width: 230,
    borderRadius: 5,
    color: colors.primary,
    paddingHorizontal: 5
  },
  timeNumber: {
    color: "#282048",
    fontSize: 14,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold
  },
  dropdownTxt: {
    color: "#282048",
    fontSize: 14,
    fontFamily: typography.primary.semiBold
  },
  timeHeading: {
    color: "#7E7991",
    fontSize: 10,
    fontFamily: typography.fonts.PlusJakartaSans.medium
  },
  firstContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  name: {
    color: "#1B005D",
    fontSize: 13,
    fontWeight: "bold",
  },
  estimate: {
    backgroundColor: "#E8EBF8",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 3,
    alignItems: "center",
    borderRadius: 5,
    marginLeft: "auto",
    marginBottom: 5,
    marginRight: 10,
    paddingHorizontal: 10,
  },
  notEstimate: {
    color: "#ACB3BB",
    fontSize: 12,
    fontWeight: "400",
  },
  estimateDivider: {
    fontWeight: "700",
  },
  checkBtn: {
    position: "absolute",
    right: 0,
    top: 21
  },
  wrapTotalTime: {
    flexDirection: "row"
  },
  totalTimeTitle: {
    color: "#7E7991",
    fontSize: 10,
    fontFamily: typography.secondary.medium
  },
  totalTimeTxt: {
    fontFamily: typography.primary.semiBold,
    fontSize: 12,
    color: "#282048"
  },
  timerIcon: {
    width: 21,
    height: 21
  },
  timerBtn: {
    width: 42,
    height: 42,
    backgroundColor: "#3826A6",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    ...GS.shadow
  }
})
