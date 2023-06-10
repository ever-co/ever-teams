/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { useEffect, useRef, useState } from "react"
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { colors } from "../theme"
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

	const allStatuses = useTaskStatusValue()
	const allSizes = useTaskSizeValue()
	const allPriorities = useTaskPriorityValue()
	const allLabels = useTaskLabelValue()

	const status = allStatuses[task?.status.split("-").join(" ")]
	const size = allSizes[task?.size]
	const priority = allPriorities[task?.priority]

	const taskLabels = task?.tags.map((t) => allLabels[t])

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
					style={[styles.scrollRight, { backgroundColor: colors.background }]}
					onPress={() => onNextPressed()}
				>
					<AntDesign name="right" size={18} color={colors.primary} />
				</TouchableOpacity>
			)}
			{labelIndex !== 0 ? (
				<TouchableOpacity
					activeOpacity={0.7}
					style={[styles.scrollRight, { left: 0, backgroundColor: colors.background }]}
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
