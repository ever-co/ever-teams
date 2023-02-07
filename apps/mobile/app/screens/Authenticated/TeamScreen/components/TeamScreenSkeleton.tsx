import React from "react"
import { ScrollView, StyleSheet, View } from "react-native";
import { Card } from "react-native-paper";
import { Skeleton } from "react-native-skeletons"
import { useAppTheme } from "../../../../app";
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization";


const TeamScreenSkeleton = () => {
    const { colors, dark } = useAppTheme()
    const { isTeamManager } = useOrganizationTeam()


    const MemberCard = () => {
        return (
            <Card style={[styles.timerCard, { backgroundColor: colors.background }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 16 }}>
                    <View style={{ width: "45%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Skeleton height={40} width={40} borderRadius={20} />
                        <Skeleton height={12} width={74} borderRadius={50} />
                    </View>
                    <View style={{ width: "40%", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ justifyContent: "space-between", alignItems: "center" }}>
                            <Skeleton height={12} width={51} borderRadius={50} style={{ marginBottom: 10 }} />
                            <Skeleton height={12} width={74} borderRadius={50} />
                        </View>
                        <Skeleton height={9} width={19} borderRadius={50} />
                    </View>
                </View>

                <View style={{ marginTop: 16, borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 16 }}>
                    <Skeleton height={12} width={"100%"} borderRadius={50} />
                    <Skeleton height={12} width={"80%"} borderRadius={50} style={{ marginTop: 11 }} />
                    <Skeleton height={12} width={"60%"} borderRadius={50} style={{ marginTop: 11 }} />
                </View>

                <View style={{ flexDirection: "row", marginTop: 16, width: "100%", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", width: "60%", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ alignItems: "center" }}>
                            <Skeleton height={12} width={51} borderRadius={50} style={{ marginBottom: 10 }} />
                            <Skeleton height={12} width={74} borderRadius={50} />
                        </View>
                        <View style={{ alignItems: "center" }}>
                            <Skeleton height={12} width={51} borderRadius={50} style={{ marginBottom: 10 }} />
                            <Skeleton height={12} width={74} borderRadius={50} />
                        </View>
                    </View>
                    <View style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 4, borderColor: colors.border }} />
                </View>
            </Card>
        )
    }
    return (
        <View style={[styles.container, { backgroundColor: colors.background2 }]}>
            <View style={[styles.header, { backgroundColor: colors.background, shadowColor: !dark ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)" }]}>
                <Skeleton width={110} height={22} borderRadius={50} />
                <Skeleton width={52} height={22} borderRadius={50} />
            </View>

            {!isTeamManager ? (
                <View style={[styles.teamSection, { backgroundColor: colors.background }]}>
                    <Skeleton height={44} borderRadius={9} />
                </View>
            ) : (
                <View style={[styles.teamSection, { backgroundColor: colors.background, flexDirection: "row", justifyContent: "space-between" }]}>
                    <Skeleton height={44} borderRadius={9} style={{ flex: 2, marginRight: 15 }} />
                    <Skeleton height={44} borderRadius={9} style={{ flex: 1 }} />
                </View>
            )}

            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                {[0, 1, 2].map((item, index) => (
                    <MemberCard key={index} />
                ))}
            </ScrollView>
        </View >
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    header: {
        width: "100%",
        paddingVertical: 16,
        paddingHorizontal: 17,
        flexDirection: "row",
        justifyContent: "space-between",
        elevation: 1,
        shadowColor: "rgba(0,0,0,0.1)",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        zIndex: 100
    },
    teamSection: {
        width: "100%",
        paddingHorizontal: 17,
        paddingTop: 27,
        paddingBottom: 33,
        zIndex: 99
    },
    timerCard: {
        marginTop: 24,
        marginHorizontal: 25,
        padding: 16,
        borderRadius: 16
    },
})
export default TeamScreenSkeleton;