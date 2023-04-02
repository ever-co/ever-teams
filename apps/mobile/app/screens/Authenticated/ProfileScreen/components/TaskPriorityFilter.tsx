/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC } from "react"
import {
	TouchableOpacity,
	View,
	Text,
	StyleSheet,
	ViewStyle,
	ScrollView,
	Dimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { AntDesign, Feather, FontAwesome } from "@expo/vector-icons"
import { GLOBAL_STYLE as GS, CONSTANT_COLOR as CC } from "../../../../../assets/ts/styles"
import { observer } from "mobx-react-lite"
import { useAppTheme } from "../../../../app"
import { typography } from "../../../../theme"
import { useStores } from "../../../../models"
import { BadgedTaskPriority } from "../../../../components/PriorityIcon"
import { useTaskPriority } from "../../../../services/hooks/features/useTaskPriority"
import { ITaskPriorityItem } from "../../../../services/interfaces/ITaskPriority"

interface TaskPriorityFilterProps {
	containerStyle?: ViewStyle
	dropdownContainerStyle?: ViewStyle
	showPriorityPopup: boolean
	setShowPriorityPopup: (value: boolean) => unknown
}

const { width, height } = Dimensions.get("window")

const TaskPriorityFilter: FC<TaskPriorityFilterProps> = observer(
	({ containerStyle, dropdownContainerStyle, setShowPriorityPopup, showPriorityPopup }) => {
		const {
			TaskStore: { filter },
		} = useStores()
		const { colors, dark } = useAppTheme()

		const priorities = filter.priorities

		if (dark) {
			return (
				<>
					<TouchableOpacity onPress={() => setShowPriorityPopup(!showPriorityPopup)}>
						<LinearGradient
							colors={["#E6BF93", "#D87555"]}
							end={{ y: 0.5, x: 1 }}
							start={{ y: 1, x: 0 }}
							style={{ ...styles.container, ...containerStyle, backgroundColor: "#F2F2F2" }}
						>
							<View style={{ flexDirection: "row", alignItems: "center" }}>
								<Text style={{ marginRight: 10 }}>Priorities</Text>
								{priorities.length === 0 ? null : (
									<FontAwesome name="circle" size={24} color="#3826A6" />
								)}
							</View>
							<AntDesign name="down" size={14} color={colors.primary} />
						</LinearGradient>
					</TouchableOpacity>
					{showPriorityPopup && (
						<TaskPriorityFilterDropDown dropdownContainer={dropdownContainerStyle} />
					)}
				</>
			)
		}

		return (
			<>
				<TouchableOpacity onPress={() => setShowPriorityPopup(!showPriorityPopup)}>
					<View style={{ ...styles.container, ...containerStyle }}>
						<View style={{ flexDirection: "row", alignItems: "center" }}>
							<Text style={{ marginRight: 10 }}>Priorities</Text>
							{priorities.length === 0 ? null : (
								<FontAwesome name="circle" size={24} color="#3826A6" />
							)}
						</View>
						<AntDesign name="down" size={14} color={colors.primary} />
					</View>
				</TouchableOpacity>
				{showPriorityPopup && (
					<TaskPriorityFilterDropDown dropdownContainer={dropdownContainerStyle} />
				)}
			</>
		)
	},
)

interface DropDownProps {
	dropdownContainer?: ViewStyle
}

const TaskPriorityFilterDropDown: FC<DropDownProps> = observer(({ dropdownContainer }) => {
	const { colors, dark } = useAppTheme()
	const { allTaskPriorities } = useTaskPriority()

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
				<Text style={[styles.dropdownTitle, { color: colors.primary }]}>Priorities</Text>
				<ScrollView bounces={false} style={{ paddingHorizontal: 16, height: height / 2.55 }}>
					{allTaskPriorities.map((item, idx) => (
						<DropDownItem priority={item} key={idx} />
					))}
				</ScrollView>
			</View>
		</View>
	)
})

const DropDownItem = observer(({ priority }: { priority: ITaskPriorityItem }) => {
	const {
		TaskStore: { filter, setFilter },
	} = useStores()
	const priorities = filter.priorities
	const exist = priorities.find((s) => s === priority)

	const onSelectedStatus = () => {
		if (exist) {
			const newStatuses = priorities.filter((s) => s !== priority)
			setFilter({
				...filter,
				priorities: newStatuses,
			})
		} else {
			setFilter({
				...filter,
				priorities: [...priorities, priority],
			})
		}
	}

	return (
		<TouchableOpacity style={styles.itemContainer} onPress={() => onSelectedStatus()}>
			<View style={styles.dropdownItem}>
				<BadgedTaskPriority TextSize={14} iconSize={14} priority={priority.name} />
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
		zIndex: 100,
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

export default TaskPriorityFilter
