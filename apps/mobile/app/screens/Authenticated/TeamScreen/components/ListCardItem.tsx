import React, { useState } from "react"
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

// COMPONENTS
import { Card, Icon, ListItem, Text } from "../../../../components"

// STYLES
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { colors, spacing } from "../../../../theme"
import ProgressTimeIndicator from "./ProgressTimeIndicator"
import { useStores } from "../../../../models"
import { secondsToTime } from "../../../../helpers/date"
export type ListItemProps = {
  item: any,
  onPressIn?: () => unknown
  enableEstimate: boolean
}

export interface Props extends ListItemProps { }

export const ListItemContent: React.FC<ListItemProps> = ({ item, enableEstimate, onPressIn }) => {
  const { TaskStore: { activeTask } } = useStores();
  const [isManager, setIsManager] = useState(true)
  const iuser = item.employee.user

  return (
    <TouchableNativeFeedback onPressIn={onPressIn}>
      <View style={[{ ...GS.p2, ...GS.positionRelative }, isManager ? { borderWidth: 1, borderColor: "black", borderRadius: 20 } : null]}>
      <View style={[styles.statusLine,{backgroundColor:CC["success"]}]}/>
        <View style={styles.firstContainer}>
          <Image
            source={{ uri: iuser.imageUrl }}
            style={$usersProfile}
          />
          <Text style={styles.name}>{iuser.name}</Text>
          {/* ENABLE ESTIMATE INPUTS */}
          {activeTask.estimate == 0 && enableEstimate ? (
            <View style={styles.estimate}>
              <TextInput
                maxLength={2}
                keyboardType={"numeric"}
                placeholder="Hh"
                style={styles.estimateInput}
              />
              <Text style={styles.estimateDivider}>/</Text>
              <TextInput
                maxLength={2}
                keyboardType={"numeric"}
                placeholder="Mm"
                style={styles.estimateInput}
              />
            </View>
          ) : (
            <View style={{ marginLeft: "auto", marginRight: 10 }}>
              <ProgressTimeIndicator
                estimated={activeTask.estimate > 0 ? true : false}
                estimatedHours={activeTask.estimate}
                workedHours={30000}
              />
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row' }}>
          {activeTask.taskNumber && <Text style={styles.taskNumberStyle}>{`#${activeTask.taskNumber}`}</Text>}
          <Text style={styles.otherText}>{"Lorem Ipsum is simply dummy text of the printing"}</Text>
        </View>
        <View style={{ borderBottomWidth: 2, borderBottomColor: "#E8EBF8" }} />
        <View style={styles.times}>
          <View>
            <Text style={styles.timeHeading}>Current time</Text>
            <Text style={styles.timeNumber}>{"00:00"}</Text>
          </View>
          <View>
            <Text style={styles.timeHeading}>Total time</Text>
            <Text style={styles.timeNumber}>{"00:00"}</Text>
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

  const handleEstimate = () => {
    setEstimateNow(true)
    setShowMenu(false)
  }

  return (
    <Card
      style={{
        ...$listCard,
        ...GS.mb3,
        borderColor: CC[props.item.estimate ? "warning" : "success"],
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
                marginRight: -spacing.extraSmall,
                backgroundColor: colors.background,
                minWidth: spacing.massive * 2.5,
                ...(!showMenu ? { display: "none" } : {}),
              }}
            >
              <View style={{}}>
                <ListItem>Edit</ListItem>
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
          enableEstimate={estimateNow}
          onPressIn={() => {
            setShowMenu(false)

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
  ...GS.noBorder,
  ...GS.shadow,
  minHeight: null,
  borderRadius: spacing.large
}

const $usersProfile: ImageStyle = {
  ...GS.roundedFull,
  backgroundColor: colors.background,
  width: spacing.huge - spacing.small,
  height: spacing.huge - spacing.small,
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
    paddingHorizontal: 10,
  },
  otherText: {
    fontSize: 12,
    color: "#ACB3BB",
    width: "80%",
    lineHeight: 15,
    marginVertical: 5,
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
    fontSize: 16,
    left: 10,
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
  estimateInput: {
    borderBottomColor: "gray",
    borderStyle: "dashed",
    borderBottomWidth: 2,
    padding: 2,
  },
  taskNumberStyle: {
    fontSize: 12,
    marginVertical: 9,
    right: 3,
    color: "#ACB3BB",
  },
  statusLine: { 
    width: "1.5%", 
    height: "80%", 
    position: "absolute", 
    top: "17%", 
    left: -3, 
    borderRadius: 3 }
})
