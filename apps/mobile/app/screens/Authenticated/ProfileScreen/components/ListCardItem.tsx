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
} from "react-native"
import { AntDesign } from '@expo/vector-icons';

// COMPONENTS
import { Card, Icon, ListItem, Text } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"
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
  handleEstimate?: () => unknown
  enableEstimate?: boolean
  enableEditTaskTitle?: boolean,
  handleTaskTitle?: () => unknown
}

export interface Props extends ListItemProps { }

export const ListItemContent: React.FC<ListItemProps> = (props) => {
  const { authenticationStore: { authToken, tenantId, organizationId }, teamStore: { activeTeamId }, TaskStore: { updateTask } } = useStores();
  const { item, enableEditTaskTitle, enableEstimate, handleEstimate, handleTaskTitle, onPressIn } = props;
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
      <View style={{ ...GS.p2, ...GS.positionRelative }}>
        <View style={styles.firstContainer}>
          <View style={{}}>
            <TouchableOpacity onLongPress={() => handleTaskTitle()}>
              <TextInput
                style={[styles.otherText, enableEditTaskTitle ? styles.titleEditMode : null]}
                defaultValue={enableEditTaskTitle ? titleInput : "#"+item.taskNumber+ " "+item.title}
                editable={enableEditTaskTitle}
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
            <View style={{ marginLeft: "auto", marginRight: 10, marginBottom: 10 }}>
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

        <View style={{ borderBottomWidth: 2, borderBottomColor: "#E8EBF8" }} />
        <View style={styles.times}>
          <View>
            <Text style={styles.timeHeading}>Worked time</Text>
            <Text style={styles.timeNumber}>{"00:00"}</Text>
          </View>
          <TaskStatus {...item} />
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

  return (
    <Card
      style={{
        ...$listCard,
        ...GS.mb3,
        zIndex: 0,
        borderColor: colors.primary,
      }}
      HeadingComponent={
        <View
          style={{
            ...GS.positionAbsolute,
            ...GS.t0,
            ...GS.r0,
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
  ...GS.rounded,
  ...GS.noBorder,
  ...GS.shadow,
  borderWidth: 1,
  minHeight: null,
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
    height: 180,
    justifyContent: "space-around",
    padding: 10,
    marginBottom: 10,
  },
  times: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingLeft: 10,
    paddingRight: 10,
    marginVertical: 10,
  },
  otherText: {
    fontSize: 12,
    color: "#ACB3BB",
    width: "100%",
    minWidth: 200,
    lineHeight: 15,
    marginVertical: 15,
    marginLeft: 5
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
    color: "#1B005D",
    fontSize: 18,
    fontWeight: "bold",
  },
  timeHeading: {
    color: "#ACB3BB",
    fontSize: 14,
  },
  firstContainer: {
    flexDirection: "row",
    alignItems: "center",
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
  editModeContainer: {

  }
})
