import React, { useEffect, useState } from "react"
import {
  View,
  ViewStyle,
  Image,
  ImageStyle,
  TouchableNativeFeedback,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Text
} from "react-native"

// COMPONENTS
import { Card, Icon, ListItem } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { colors, spacing, typography } from "../../../../theme"
import ProgressTimeIndicator from "./ProgressTimeIndicator"
import { useStores } from "../../../../models"
import { convertMsToTime, secondsToTime } from "../../../../helpers/date"
import { pad } from "../../../../helpers/number"
import { useTimer } from "../../../../services/hooks/useTimer"
import EstimateTime from "../../TimerScreen/components/EstimateTime"
import { IUser } from "../../../../services/interfaces/IUserData"
import { observer } from "mobx-react-lite"
import { ITeamTask } from "../../../../services/interfaces/ITask"

export type ListItemProps = {
  member: IUser,
  onPressIn?: (user: IUser) => unknown
  enableEstimate: boolean,
  index: number,
  userStatus: string;
}
interface IUserStatus {
  icon: any,
  color: string
}

export interface Props extends ListItemProps { }

export const ListItemContent: React.FC<ListItemProps> = observer(({ member, enableEstimate, onPressIn, userStatus }) => {
  const {
    teamStore: { activeTeam },
    TaskStore: { activeTask },
    TimerStore: { timeCounterState },
    authenticationStore: { user }
  } = useStores();
  const {
    startTimer,
    stopTimer,
    getTimerStatus,
    toggleTimer,
    timeCounter,
    fomatedTimeCounter: { hours, minutes, seconds, ms_p },
    timerStatusFetchingState,
    canRunTimer,
  } = useTimer();

  const isAuthUser = member.employee.userId === user?.id;
  const [isManager, setIsManager] = useState(true)
  const [editEstimate, setEditEstimate] = useState(false);
  const [memberTask, setMemberTask] = useState<ITeamTask | null>(null)
  const iuser = member.employee.user

  useEffect(() => {
    if (isAuthUser) {
      setMemberTask(activeTask);
    }
  }, [isAuthUser, activeTask, activeTeam])

  return (
    <TouchableOpacity onPress={() => onPressIn(iuser)}>
      <View style={[{ ...GS.p3, ...GS.positionRelative, backgroundColor: "#fff" }, { borderRadius: 20 }]}>
        <View style={styles.firstContainer}>
          <View style={styles.wrapProfileImg}>
            <Image
              source={{ uri: iuser.imageUrl }}
              style={$usersProfile}
            />
            <Image style={styles.statusIcon} source={getStatusImage(userStatus).icon} />
          </View>
          <Text style={styles.name}>{iuser.name}</Text>
          {/* ENABLE ESTIMATE INPUTS */}
          <View style={styles.wrapTotalTime}>
            <Text style={styles.totalTimeTitle}>Total time:</Text>
            <Text style={styles.totalTimeText}>20 h:30 m</Text>
          </View>
        </View>
        <View style={styles.wrapTaskTitle}>
          {/* {activeTask.taskNumber && <Text style={styles.taskNumberStyle}>{`#${activeTask.taskNumber}`}</Text>} */}
          <Text style={styles.otherText}>{memberTask ? memberTask.title:""}</Text>
        </View>
        <View style={styles.times}>
          <View style={{ ...GS.alignCenter }}>
            <Text style={styles.timeHeading}>Today work</Text>
            <Text style={styles.timeNumber}>{pad(hours)} h:{pad(minutes)} m</Text>
          </View>
          <View style={{ ...GS.alignCenter }}>
            <Text style={styles.timeHeading}>Total work</Text>
            <Text style={styles.timeNumber}>{"01 h:10 m"}</Text>
          </View>
          {activeTask.estimate == 0 && editEstimate ? (
            <View style={styles.estimate}>
              <EstimateTime setEditEstimate={setEditEstimate} />
            </View>

          ) : (
            <View style={{}}>
              <TouchableOpacity onPress={() => setEditEstimate(true)}>
                <View style={{}}>
                  <ProgressTimeIndicator
                    estimated={memberTask && memberTask.estimate > 0 ? true : false}
                    estimatedHours={memberTask ? memberTask.estimate :0}
                    workedHours={3000000}
                  />
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
})

const ListCardItem: React.FC<Props> = (props) => {
  // STATS
  const [showMenu, setShowMenu] = React.useState(false)
  const [estimateNow, setEstimateNow] = React.useState(false)

  const handleEstimate = () => {
    setEstimateNow(true)
    setShowMenu(false)
  }

  const { index, userStatus } = props;
  return (
    <Card
      style={{
        ...$listCard,
        ...GS.mb3,
        paddingTop: 5,
        backgroundColor: getStatusImage(userStatus).color,
        zIndex: 999 - index
      }}
      HeadingComponent={
        <View
          style={{
            ...GS.positionAbsolute,
            ...GS.t0,
            ...GS.r0,
            ...GS.pt5,
            ...GS.pr3,
            ...GS.zIndexFront
          }}
        >
          <View
            style={{
              ...GS.positionRelative,
              backgroundColor: "#fff",
              ...GS.zIndexFront
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
                <ListItem textStyle={styles.dropdownTxt}>Edit Task</ListItem>
                <ListItem textStyle={styles.dropdownTxt} onPress={() => handleEstimate()}>Estimate</ListItem>
                <ListItem textStyle={styles.dropdownTxt}>Assign Task</ListItem>
                <ListItem textStyle={styles.dropdownTxt}>Unassign Task</ListItem>
                <ListItem textStyle={styles.dropdownTxt}>Make a Manager</ListItem>
                <ListItem textStyle={[styles.dropdownTxt, { color: "#DE5536" }]} style={{}}>Remove</ListItem>
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
          enableEstimate={estimateNow}
        // onPressIn={() => {
        //   setShowMenu(false)
        //   props.onPressIn
        // }}
        />
      }
    />
  )
}

export default ListCardItem

const $listCard: ViewStyle = {
  ...GS.flex1,
  ...GS.p0,
  ...GS.noBorder,
  ...GS.shadow,
  minHeight: null,
  borderRadius: spacing.large,
}

const $usersProfile: ImageStyle = {
  ...GS.roundedFull,
  backgroundColor: colors.background,
  width: spacing.huge - spacing.extraSmall,
  height: spacing.huge - spacing.extraSmall,
}

const styles = StyleSheet.create({
  mainContainer: {
    borderColor: "#1B005D",
    borderWidth: 0.5,
    borderRadius: 20,
    height: 180,
    justifyContent: "space-around",
    padding: 10,
  },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.06)",
    // backgroundColor:"yellow"
  },
  otherText: {
    fontSize: 14,
    color: "#282048",
    width: "100%",
    lineHeight: 15,
    marginVertical: 5,
    fontStyle: "normal",
    fontFamily: typography.fonts.PlusJakartaSans.semiBold,
  },
  timeNumber: {
    color: "#282048",
    fontSize: 14,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold
  },
  timeHeading: {
    color: "#7E7991",
    fontSize: 10,
    fontFamily: typography.fonts.PlusJakartaSans.medium
  },
  firstContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    color: "#1B005D",
    fontSize: 12,
    left: 15,
    fontFamily: typography.fonts.PlusJakartaSans.semiBold
  },
  estimate: {
    backgroundColor: "#E8EBF8",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    alignItems: "center",
    borderRadius: 5,
    marginLeft: "auto",
    marginRight: 10,
  },


  wrapTotalTime: {
    position: "absolute",
    right: 0,
    marginRight: 30,
    justifyContent: "center",
    alignItems: "center"
  },
  totalTimeTitle: {
    fontSize: 10,
    fontFamily: typography.fonts.PlusJakartaSans.medium,
    fontWeight: "500",
    color: "#7E7991"
  },
  totalTimeText: {
    fontSize: 14,
    color: "#282048",
    fontFamily: typography.fonts.PlusJakartaSans.semiBold
  },
  wrapProfileImg: {
    flexDirection: "row"
  },
  statusIcon: {
    position: "absolute",
    bottom: 0,
    marginLeft: 27
  },
  dropdownTxt: {
    color: "#282048",
    fontSize: 14,
    fontFamily: typography.primary.semiBold
  },
  wrapTaskTitle: {
    flexDirection: 'row',
    marginTop: 16,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.06)",
    paddingTop: 10
  }
})

const getStatusImage = (status: string) => {
  let res: IUserStatus
  if (status == "online") {
    res = {
      icon: require("../../../../../assets/icons/new/play-small.png"),
      color: "#88D1A5"
    }
  }
  else if (status == "pause") {

    res = {
      icon: require("../../../../../assets/icons/new/on-pause.png"),
      color: "#EBC386"
    }
  } else {

    res = {
      icon: require("../../../../../assets/icons/new/away.png"),
      color: "#F1A2A2"
    }
  }
  return res;
}