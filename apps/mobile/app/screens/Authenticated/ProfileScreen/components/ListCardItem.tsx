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
  Dimensions
} from "react-native"
import { AntDesign } from '@expo/vector-icons';

// COMPONENTS
import { Card, Icon, ListItem, Text } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { colors, spacing, typography } from "../../../../theme"
import ProgressTimeIndicator from "../../TeamScreen/components/ProgressTimeIndicator"
import TaskStatus from "./TaskStatus"
import { ITeamTask } from "../../../../services/interfaces/ITask"
import EstimateTime from "../../TimerScreen/components/EstimateTime"
import { observer } from "mobx-react-lite"
import { useStores } from "../../../../models";
import { ActivityIndicator } from "react-native-paper";

export type ListItemProps = {
  item: ITeamTask
  onPressIn?: () => unknown
  handleEstimate?: () => unknown,
  isActive: boolean,
  tabIndex: number,
  isAuthUser: boolean,
  enableEstimate?: boolean
  enableEditTaskTitle?: boolean,
  handleTaskTitle?: () => unknown
}

export interface Props extends ListItemProps { }

const { width, height } = Dimensions.get("window")

export const ListItemContent: React.FC<ListItemProps> = (props) => {
  const { authenticationStore: { authToken, tenantId, organizationId }, teamStore: { activeTeamId }, TaskStore: { updateTask } } = useStores();
  const { item, enableEditTaskTitle, enableEstimate, handleEstimate, handleTaskTitle, onPressIn, isActive, tabIndex, isAuthUser } = props;
  const [titleInput, setTitleInput] = useState("")
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    setTitleInput(item.title)
  }, [enableEditTaskTitle])

  const onChangeTaskTitle = () => {

    const task: ITeamTask = {
      ...item,
      title: titleInput
    };
    const refreshData = {
      activeTeamId,
      tenantId,
      organizationId
    }
    setLoading(true)
    updateTask({ taskData: task, taskId: task.id, authToken, refreshData });
    setLoading(false)
    handleTaskTitle()
  }

  return (
    <TouchableNativeFeedback onPressIn={onPressIn}>
      <View style={{ ...GS.p4, ...GS.positionRelative }}>
        <View>
          <View style={styles.wrapTotalTime}>
            <Text style={styles.totalTimeTitle}>Total time : </Text>
            <Text style={styles.totalTimeTxt}>20 h:30 m</Text>
          </View>
        </View>

        <View style={styles.firstContainer}>
          <View style={{}}>
            <TouchableOpacity onLongPress={() => handleTaskTitle()}>
              <TextInput
                style={[styles.otherText, enableEditTaskTitle ? styles.titleEditMode : null]}
                defaultValue={enableEditTaskTitle ? titleInput : item.title}
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
              <EstimateTime setEditEstimate={handleEstimate} />
            </View>
          ) : (
            <View style={{ right: -5, top: -5 }}>
              <TouchableOpacity onPress={() => handleEstimate()}>
                <ProgressTimeIndicator
                  estimated={item.estimate > 0 ? true : false}
                  estimatedHours={item.estimate}
                  workedHours={30}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.times}>
          <View style={{ flexDirection: "row", width: "50%", alignItems: "center" }}>
            {isAuthUser ? (
              <TouchableOpacity style={[styles.timerBtn, isActive ? {} : { backgroundColor: "#fff" }]}>
                <Image resizeMode="contain" style={[styles.timerIcon,]} source={isActive ? require("../../../../../assets/icons/new/stop.png") : require("../../../../../assets/icons/new/play.png")} />
              </TouchableOpacity>
            ) : tabIndex == 2 ? (
              <TouchableOpacity style={[styles.timerBtn, { backgroundColor: "#fff" }]}>
                <Image resizeMode="contain" style={[styles.timerIcon,]} source={require("../../../../../assets/icons/new/arrow-right.png")} />
              </TouchableOpacity>
            ) : null}
            {tabIndex === 2 ? (
              <View style={{ left: 12, justifyContent: "center", alignItems: "center" }}>
                <Text style={styles.timeHeading}>Assigned by</Text>
                <Text style={styles.timeNumber}>8 people</Text>
              </View>
            ) : (
              <View style={{ justifyContent: "center", alignItems: "center" }}>
                <Text style={styles.timeHeading}>Worked time</Text>
                <Text style={styles.timeNumber}>{"00 h:00 m"}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 133, height: 33 }}>
            <TaskStatus {...item} />
          </View>
        </View>
      </View>
    </TouchableNativeFeedback>
  )
}


const ListCardItem: React.FC<Props> = (props) => {
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
  const { isActive } = props;
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
                ...GS.pt4,
                ...GS.shadow,
                ...GS.r0,
                ...GS.roundedSm,
                marginTop: -spacing.extraSmall,
                marginRight: -spacing.tiny,
                backgroundColor: colors.background,
                minWidth: spacing.massive * 1.5,
                ...(!showMenu ? { display: "none" } : {}),
              }}
            >
              <View style={{}}>
                <ListItem onPress={() => handleTaskTitle()}>Edit</ListItem>
                <ListItem>Release</ListItem>
                <ListItem onPress={() => handleEstimate()}>Estimate now</ListItem>
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
