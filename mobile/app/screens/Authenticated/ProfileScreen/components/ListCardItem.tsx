import React from "react"
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
import ProgressTimeIndicator from "../../TeamScreen/components/ProgressTimeIndicator"
import TaskStatusDropdown from "../../TimerScreen/components/TaskStatusDropdown"
export type ListItemProps = {
  item: {
    name: string
    text: string
    currentTime: string
    totalTime: string
    estimate: boolean
  }
  onPressIn?: () => unknown
  enableEstimate: boolean
}

export interface Props extends ListItemProps {}

export const ListItemContent: React.FC<ListItemProps> = ({ item, enableEstimate, onPressIn }) => {
  return (
    <TouchableNativeFeedback onPressIn={onPressIn}>
      <View style={{ ...GS.p2, ...GS.positionRelative }}>
        <View style={styles.firstContainer}>
          <Text style={styles.otherText}>{item.text}</Text>
          {/* ENABLE ESTIMATE INPUTS */}
          {!item.estimate && enableEstimate ? (
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
            <View style={{ marginLeft: "auto", marginRight: 10, marginBottom: 10 }}>
              <ProgressTimeIndicator
                estimated={item.estimate}
                estimatedHours={50}
                workedHours={30}
              />
            </View>
          )}
        </View>

        <View style={{ borderBottomWidth: 2, borderBottomColor: "#E8EBF8" }} />
        <View style={styles.times}>
          <View>
            <Text style={styles.timeHeading}>Worked time</Text>
            <Text style={styles.timeNumber}>{item.currentTime}</Text>
          </View>
          <View style={{ width: 150 }}>
            <TaskStatusDropdown/>
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
    width: "80%",
    lineHeight: 15,
    marginVertical: 15,
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
})
