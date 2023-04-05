import React from "react"
import { ScrollView, StyleSheet, View } from "react-native"
import { Card } from "react-native-paper"
import { Skeleton } from "react-native-skeletons"
import { useOrganizationTeam } from "../../../../services/hooks/useOrganization"
import { useAppTheme } from "../../../../theme"

const ProfileScreenSkeleton = () => {
	const { colors, dark } = useAppTheme()
	const { isTeamManager } = useOrganizationTeam()

	const MemberCard = () => {
		return (
			<Card style={[styles.timerCard, { backgroundColor: colors.background }]}>
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						borderBottomColor: colors.border,
						borderBottomWidth: 1,
						paddingBottom: 16,
					}}
				>
					<Skeleton height={9} width={127} borderRadius={50} />
					<Skeleton height={9} width={19} borderRadius={50} />
				</View>

				<View
					style={{
						marginTop: 16,
						borderBottomColor: colors.border,
						borderBottomWidth: 1,
						paddingBottom: 16,
						flexDirection: "row",
						justifyContent: "space-between",
					}}
				>
					<View style={{ width: "70%" }}>
						<Skeleton height={12} width={"100%"} borderRadius={50} />
						<Skeleton height={12} width={"60%"} borderRadius={50} style={{ marginTop: 11 }} />
						<Skeleton height={12} width={"90%"} borderRadius={50} style={{ marginTop: 11 }} />
					</View>
					<View
						style={{
							width: 48,
							height: 48,
							borderRadius: 24,
							borderWidth: 4,
							borderColor: colors.border,
						}}
					/>
				</View>

				<View
					style={{
						flexDirection: "row",
						marginTop: 16,
						width: "100%",
						justifyContent: "space-between",
					}}
				>
					<View
						style={{
							flexDirection: "row",
							width: "40%",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<Skeleton height={42} width={42} borderRadius={21} />
						<View style={{ alignItems: "center" }}>
							<Skeleton height={12} width={51} borderRadius={50} style={{ marginBottom: 10 }} />
							<Skeleton height={12} width={74} borderRadius={50} />
						</View>
					</View>
					<Skeleton height={33} width={120} borderRadius={10} />
				</View>
			</Card>
		)
	}
	return (
		<View style={[styles.container, { backgroundColor: colors.background2 }]}>
			<View
				style={[
					styles.header,
					{
						backgroundColor: colors.background,
						shadowColor: !dark ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
					},
				]}
			>
				<Skeleton width={110} height={22} borderRadius={50} />
				<Skeleton width={52} height={22} borderRadius={50} />
			</View>

			<View style={{ ...styles.teamSection, backgroundColor: colors.background }}>
				<View style={{ flexDirection: "row", alignItems: "center" }}>
					<Skeleton height={56} width={56} borderRadius={28} />
					<View style={{ marginLeft: 16 }}>
						<Skeleton height={15} width={163} borderRadius={28} style={{ marginBottom: 16 }} />
						<Skeleton height={9} width={127} borderRadius={28} />
					</View>
				</View>
				<View style={styles.btnSection}>
					<Skeleton height={44} width={"45%"} borderRadius={9} />
					<Skeleton height={44} width={"45%"} borderRadius={9} />
				</View>

				<View style={{ ...styles.btnSection, marginTop: 46 }}>
					<Skeleton height={28} width={"30%"} borderRadius={50} />
					<Skeleton height={28} width={"30%"} borderRadius={50} />
					<Skeleton height={28} width={"30%"} borderRadius={50} />
				</View>
			</View>
			<ScrollView style={{ padding: 24 }} bounces={false} showsVerticalScrollIndicator={false}>
				<View
					style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
				>
					<Skeleton height={9} width={"20%"} borderRadius={50} />
					<View style={{ height: 1, width: "50%", backgroundColor: colors.border }} />
					<Skeleton height={9} width={"20%"} borderRadius={50} />
				</View>
				<MemberCard />
				<View style={{ ...styles.btnSection, alignItems: "center", marginTop: 24 }}>
					<Skeleton height={9} width={"30%"} borderRadius={50} />
					<View style={{ height: 1, width: "68%", backgroundColor: colors.border }} />
				</View>
				<MemberCard />
				<MemberCard />
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	btnSection: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 24,
		width: "100%",
	},
	container: {
		flex: 1,
	},
	header: {
		elevation: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 17,
		paddingVertical: 16,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 1,
		width: "100%",
		zIndex: 100,
	},
	teamSection: {
		paddingBottom: 8,
		paddingHorizontal: 17,
		paddingTop: 27,
		width: "100%",
		zIndex: 99,
	},
	timerCard: {
		borderRadius: 16,
		marginTop: 24,
		padding: 16,
	},
})
export default ProfileScreenSkeleton
