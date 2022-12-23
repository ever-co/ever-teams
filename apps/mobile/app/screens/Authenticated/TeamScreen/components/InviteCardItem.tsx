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
import { imgTitle } from "../../../../helpers/img-title"

export type ListItemProps = {
    item: any,
    //   onPressIn?: (user: IUser) => unknown
}
interface IUserStatus {
    icon: any,
    color: string
}

export interface Props extends ListItemProps { }

export const ListItemContent: React.FC<ListItemProps> = observer(({ item }) => {



    const status = "online"

    return (
        <TouchableOpacity onPress={() => {}}>
            <View style={[{ ...GS.p3, ...GS.positionRelative, backgroundColor: "#fff" }, { borderRadius: 20 }]}>
                <View style={styles.firstContainer}>
                    <View style={styles.wrapProfileImg}>
                        <View style={$usersProfile}>
                            <Text style={{fontFamily:typography.primary.semiBold}}>{imgTitle(item?.fullName)}</Text>
                        </View>
                        <Image style={styles.statusIcon} source={require("../../../../../assets/icons/new/invite-status-icon.png")} />
                    </View>
                    <Text style={styles.name}>{item?.fullName}</Text>
                    {/* ENABLE ESTIMATE INPUTS */}
                    <View style={styles.wrapTotalTime}>
                        <Text style={styles.totalTimeTitle}>Total time:</Text>
                        <Text style={styles.totalTimeText}>0 h:0 m</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', marginTop: 16, width: "100%" }}>
                    {/* {activeTask.taskNumber && <Text style={styles.taskNumberStyle}>{`#${activeTask.taskNumber}`}</Text>} */}
                    <Text style={styles.otherText}>{"Working on UI Design & making prototype for user testing tomorrow"}</Text>
                </View>
                <View style={styles.times}>
                    <View>
                        <Text style={styles.timeHeading}>Today work</Text>
                        <Text style={styles.timeNumber}>0 h:0 m</Text>
                    </View>
                    <View>
                        <Text style={styles.timeHeading}>Total work</Text>
                        <Text style={styles.timeNumber}>{"01 h:10 m"}</Text>
                    </View>
        
                        <View style={{}}>
                            <TouchableOpacity onPress={() => {}}>
                                <View style={{}}>
                                    <ProgressTimeIndicator
                                        estimated={false}
                                        estimatedHours={0}
                                        workedHours={0}
                                    />
                                </View>
                            </TouchableOpacity>
                        </View>
                </View>
            </View>
        </TouchableOpacity>
    )
})

const InviteCardItem: React.FC<Props> = (props) => {
    // STATS
    const [showMenu, setShowMenu] = React.useState(false)
    const [estimateNow, setEstimateNow] = React.useState(false)

    const handleEstimate = () => {
        setEstimateNow(true)
        setShowMenu(false)
    }
    const status = "online"

    return (
        <Card
            style={{
                ...$listCard,
                ...GS.mb3,
                paddingTop: 5,
                backgroundColor: "#DCD6D6",
                zIndex: 800
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
                // onPressIn={() => {
                //   setShowMenu(false)
                //   props.onPressIn
                // }}
                />
            }
        />
    )
}

export default InviteCardItem

const $listCard: ViewStyle = {
    ...GS.flex1,
    ...GS.p0,
    ...GS.noBorder,
    ...GS.shadow,
    minHeight: null,
    borderRadius: spacing.large,
}

const $usersProfile: ViewStyle = {
    width: spacing.huge - spacing.extraSmall,
    height: spacing.huge - spacing.extraSmall,
    borderColor:colors.primary,
    justifyContent:'center',
    alignItems:'center',
    borderWidth:1,
    borderRadius:20,
    opacity:0.2
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
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(0, 0, 0, 0.06)",
    },
    otherText: {
        fontSize: 14,
        color: "#282048",
        width: "100%",
        lineHeight: 15,
        marginVertical: 5,
        fontStyle: "normal",
        fontFamily: typography.primary.semiBold,
        opacity:0.2
    },
    timeNumber: {
        color: "#282048",
        fontSize: 14,
        fontFamily: typography.primary.semiBold,
        opacity:0.2
    },
    timeHeading: {
        color: "#7E7991",
        fontSize: 10,
        fontFamily: typography.secondary.medium,
        opacity:0.2
    },
    firstContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    name: {
        color: "#1B005D",
        fontSize: 12,
        left: 15,
        fontFamily: typography.primary.semiBold,
        opacity:0.2
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
        fontFamily: typography.secondary.semiBold,
        fontWeight: "500",
        color: "#7E7991",
        opacity:0.2
    },
    totalTimeText: {
        fontSize: 14,
        color: "#282048",
        fontFamily: typography.primary.semiBold,
        opacity:0.2
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
    }
})
