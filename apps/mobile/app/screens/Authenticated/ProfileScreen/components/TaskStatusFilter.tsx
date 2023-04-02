/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	ViewStyle,
	TextStyle,
	ScrollView,
	Dimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { AntDesign, Feather, FontAwesome } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS } from "../../../../../assets/ts/styles"
import { BadgedTaskStatus } from "../../../../components/StatusIcon"
import { observer } from "mobx-react-lite"
import { useAppTheme } from "../../../../app"
import { typography } from "../../../../theme"
import { useStores } from "../../../../models"
import { useTaskStatus } from "../../../../services/hooks/features/useTaskStatus"
import { ITaskStatusItem } from "../../../../services/interfaces/ITaskStatus"

interface TaskStatusFilterProps {
	containerStyle?: ViewStyle
	statusTextSyle?: TextStyle
	dropdownContainerStyle?: ViewStyle
	showTaskStatus: boolean
	setShowTaskStatus: (value: boolean) => unknown
}

const { width, height } = Dimensions.get("window")

const TaskStatusFilter: FC<TaskStatusFilterProps> = observer(
	({ containerStyle, dropdownContainerStyle, setShowTaskStatus, showTaskStatus }) => {
		const {
			TaskStore: { filter },
		} = useStores()
		const { colors, dark } = useAppTheme()

		const statuses = filter.statuses

		if (dark) {
			return (
				<>
					<TouchableOpacity onPress={() => setShowTaskStatus(!showTaskStatus)}>
						<LinearGradient
							colors={["#E6BF93", "#D87555"]}
							end={{ y: 0.5, x: 1 }}
							start={{ y: 1, x: 0 }}
							style={{ ...styles.container, ...containerStyle, backgroundColor: "#F2F2F2" }}
						>
							<View style={{ flexDirection: "row", alignItems: "center" }}>
								<Text style={{ marginRight: 10 }}>Status</Text>
								{statuses.length === 0 ? null : (
									<FontAwesome name="circle" size={24} color="#3826A6" />
								)}
							</View>
							<AntDesign name="down" size={14} color={colors.primary} />
						</LinearGradient>
					</TouchableOpacity>
					{showTaskStatus && (
						<TaskStatusFilterDropDown dropdownContainer={dropdownContainerStyle} />
					)}
				</>
			)
		}

		return (
			<>
				<TouchableOpacity onPress={() => setShowTaskStatus(!showTaskStatus)}>
					<View style={{ ...styles.container, ...containerStyle, backgroundColor: "#F2F2F2" }}>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<Text style={{ marginRight: 10 }}>Status</Text>
							{statuses.length === 0 ? null : (
								<FontAwesome name="circle" size={24} color="#3826A6" />
							)}
						</View>
						<AntDesign name="down" size={14} color={colors.primary} />
					</View>
				</TouchableOpacity>
				{showTaskStatus && <TaskStatusFilterDropDown dropdownContainer={dropdownContainerStyle} />}
			</>
		)
	},
)

interface DropDownProps {
	dropdownContainer?: ViewStyle
}

const TaskStatusFilterDropDown: FC<DropDownProps> = observer(({ dropdownContainer }) => {
	const { colors, dark } = useAppTheme()
	const { allStatuses } = useTaskStatus()

	return (
		<View
			style={[
				styles.dropdownContainer,
				dropdownContainer,
				{
					backgroundColor: colors.background,
					shadowColor: dark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)",
				},
			]}
		>
			<View style={styles.secondContainer}>
				<Text style={[styles.dropdownTitle, { color: colors.primary }]}>Statuses</Text>
				<ScrollView bounces={false} style={{ paddingHorizontal: 16, height: height / 2.55 }}>
					{allStatuses.map((item, idx) => (
						<DropDownItem status={item} key={idx} />
					))}
				</ScrollView>
			</View>
		</View>
	)
})

const DropDownItem = observer(({ status }: { status: ITaskStatusItem }) => {
	const {
		TaskStore: { filter, setFilter },
	} = useStores()
	const statuses = filter.statuses
	const exist = statuses.find((s) => s === status)

	const onSelectedStatus = () => {
		if (exist) {
			const newStatuses = statuses.filter((s) => s !== status)
			setFilter({
				...filter,
				statuses: newStatuses,
			})
		} else {
			setFilter({
				...filter,
				statuses: [...statuses, status],
			})
		}
	}

	return (
		<TouchableOpacity style={styles.itemContainer} onPress={() => onSelectedStatus()}>
			<View style={styles.dropdownItem}>
				<BadgedTaskStatus TextSize={14} iconSize={14} status={status.name} />
			</View>
			{exist ? (
				<AntDesign name="checkcircle" size={24} color="#27AE60" />
			) : (
				<Feather name="circle" size={24} color="rgba(40, 32, 72, 0.43)" />
			)}
		</TouchableOpacity>
	)
})

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.16)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		justifyContent: "space-between",
		minHeight: 30,
		minWidth: 100,
		paddingHorizontal: 8,
	},
	dropdownContainer: {
		borderRadius: 20,
		left: -(height / 67),
		minHeight: height / 2.3,
		minWidth: width - 18,
		position: "absolute",
		top: 47,
		zIndex: 1001,
		...GS.noBorder,
		borderWidth: 1,
		elevation: 10,
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 1,
		shadowRadius: 10,
	},
	dropdownItem: {
		alignItems: "center",
		borderRadius: 10,
		elevation: 10,
		flexDirection: "row",
		height: 44,
		paddingHorizontal: 8,
		shadowColor: "rgba(0,0,0,0.1)",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 1,
		shadowRadius: 1,
		width: "60%",
	},
	dropdownTitle: {
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		marginBottom: 5,
		marginLeft: 16,
	},
	itemContainer: {
		alignItems: "center",
		borderColor: "rgba(0,0,0,0.2)",
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: "row",
		height: 56,
		justifyContent: "space-between",
		marginVertical: 5,
		paddingLeft: 6,
		paddingRight: 18,
		width: "100%",
	},
	secondContainer: {
		marginVertical: 16,
	},
})

export default TaskStatusFilter
