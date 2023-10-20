/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { useEffect, useRef, useState } from "react"
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { useAppTheme } from "../theme"
import LabelItem from "./LabelItem"
import {
	useTaskLabelValue,
	useTaskPriorityValue,
	useTaskSizeValue,
	useTaskStatusValue,
} from "./StatusType"
import { ITeamTask } from "../services/interfaces/ITask"

const AllTaskStatuses = ({ task }: { task: ITeamTask }) => {
	const flatListRef = useRef<FlatList>(null)
	const [labelIndex, setLabelIndex] = useState(0)
	const { dark, colors } = useAppTheme()

	const allStatuses = useTaskStatusValue()
	const allSizes = useTaskSizeValue()
	const allPriorities = useTaskPriorityValue()
	const allLabels = useTaskLabelValue()

	const statusValue = task?.status?.split("-").join(" ").toLowerCase()
	const status =
		allStatuses &&
		Object.values(allStatuses).find((item) => item?.name.toLowerCase() === statusValue)

	const sizeValue = task?.size?.split("-").join(" ").toLowerCase()
	const size =
		allSizes && Object.values(allSizes).find((item) => item?.name.toLowerCase() === sizeValue)

	const priorityValue = task?.priority?.split("-").join(" ").toLowerCase()
	const priority =
		allPriorities &&
		Object.values(allPriorities).find((item) => item?.name.toLowerCase() === priorityValue)

	const taskLabels = task?.tags.map((tag) => allLabels[tag.name])

	const labels = [size && status, size && size, priority && priority, ...(taskLabels || [])].filter(
		(t) => t !== null && t !== undefined,
	)

	useEffect(() => {
		if (labels.length > 0) {
			flatListRef.current?.scrollToIndex({
				animated: true,
				index: labelIndex,
				viewPosition: 0,
			})
		}
	}, [labelIndex])

	const onNextPressed = () => {
		if (labelIndex !== labels.length - 2) {
			setLabelIndex(labelIndex + 1 === labels.length ? +labelIndex : labelIndex + 1)
		}
	}

	const onPrevPressed = () => {
		if (labelIndex === 0) {
			return
		}
		setLabelIndex(labelIndex - 1)
	}

	return (
		<View style={styles.labelFlatList}>
			<FlatList
				data={labels}
				initialScrollIndex={labelIndex}
				renderItem={({ item, index }) => (
					<View key={index} style={{ marginHorizontal: 2 }}>
						<LabelItem label={item?.name} background={item?.bgColor} icon={item?.icon} />
					</View>
				)}
				horizontal={true}
				showsHorizontalScrollIndicator={false}
				ref={flatListRef}
				keyExtractor={(_, index) => index.toString()}
				style={{ marginRight: 10, overflow: "scroll" }}
			/>
			{labelIndex === labels.length - 2 || labels.length < 3 ? null : (
				<TouchableOpacity
					activeOpacity={0.7}
					style={[styles.scrollRight, { backgroundColor: dark ? "#1e2430" : colors.background }]}
					onPress={() => onNextPressed()}
				>
					<AntDesign name="right" size={18} color={colors.primary} />
				</TouchableOpacity>
			)}
			{labelIndex !== 0 ? (
				<TouchableOpacity
					activeOpacity={0.7}
					style={[
						styles.scrollRight,
						{ left: 0, backgroundColor: dark ? "#1e2430" : colors.background },
					]}
					onPress={() => onPrevPressed()}
				>
					<AntDesign name="left" size={18} color={colors.primary} />
				</TouchableOpacity>
			) : null}
		</View>
	)
}

export default AllTaskStatuses

const styles = StyleSheet.create({
	labelFlatList: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 16,
		width: "74%",
	},
	scrollRight: {
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 20,
		elevation: 10,
		height: 27,
		justifyContent: "center",
		padding: 5,
		position: "absolute",
		right: 0,
		shadowColor: "rgba(0,0,0,0.16)",
		shadowOffset: { width: 0, height: 5 },
		shadowOpacity: 1,
		shadowRadius: 15,
		width: 28,
	},
})
