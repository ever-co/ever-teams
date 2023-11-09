/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import React, { useCallback, useMemo, useState } from "react"
import {
	ITeamTask,
	LinkedTaskIssue,
	TaskRelatedIssuesRelationEnum,
} from "../../../../services/interfaces/ITask"
import IssuesModal from "../../../IssuesModal"
import TaskStatus from "../../../TaskStatus"
import { translate } from "../../../../i18n"
import ActionTypesModal from "./ActionTypesModal"
import { limitTextCharaters } from "../../../../helpers/sub-text"
import { useTaskLinkedIssues } from "../../../../services/hooks/features/useTaskLinkedIssue"

interface ITaskLinkedIssue {
	task: ITeamTask
	issue?: LinkedTaskIssue
	relatedTaskModal?: boolean
}

const TaskLinkedIssue: React.FC<ITaskLinkedIssue> = ({ task, issue, relatedTaskModal }) => {
	const { actionType, actionTypeItems, onChange } = useActionType(
		issue?.action || TaskRelatedIssuesRelationEnum.RELATES_TO,
		issue,
	)

	return (
		<View
			style={{
				paddingHorizontal: 12,
				flexDirection: "row",
				justifyContent: "space-between",
				alignItems: "center",
			}}
		>
			<TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }}>
				<IssuesModal readonly={true} task={task} relatedIssueIconDimension={true} />
				<Text style={{ fontSize: 8, fontWeight: "600", color: "#BAB8C4", marginLeft: 6 }}>
					#{task?.number}-
				</Text>
				<Text style={{ fontSize: 10, fontWeight: "600" }}>
					{limitTextCharaters({
						text: task?.title,
						numChars: relatedTaskModal ? 23 : 30,
					})}
				</Text>
			</TouchableOpacity>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 4,
				}}
			>
				{relatedTaskModal && issue && (
					<ActionTypesModal
						actionItems={actionTypeItems}
						actionType={actionType}
						onChange={onChange}
					/>
				)}
				<TaskStatus
					labelOnly={true}
					task={task}
					containerStyle={{
						...styles.taskStatus,
						borderWidth: !task?.status ? 1 : 0,
					}}
				/>
			</View>
		</View>
	)
}

export default TaskLinkedIssue

export type ActionType = { name: string; value: TaskRelatedIssuesRelationEnum }
export type DropdownItem<D = Record<string | number | symbol, any>> = {
	key: React.Key
	Label: (props: { active?: boolean; selected?: boolean }) => JSX.Element
	selectedLabel?: React.ReactNode
	itemTitle?: string
	disabled?: boolean
	data?: D
}
export type ActionTypeItem = DropdownItem<ActionType>

function mapToActionType(items: ActionType[] = []) {
	return items.map<ActionTypeItem>((item) => {
		return {
			key: item.value,
			Label: () => {
				return (
					<TouchableOpacity style={styles.button}>
						<Text style={styles.labelText}>{item.name}</Text>
					</TouchableOpacity>
				)
			},
			selectedLabel: <Text style={styles.selectedLabelText}>{item.name}</Text>,
			data: item,
		}
	})
}

function useActionType(
	defaultValue: TaskRelatedIssuesRelationEnum,
	issue: LinkedTaskIssue | undefined,
) {
	// const { queryCall } = useQuery(updateTaskLinkedIssueAPI)

	const { updateTaskLinkedIssue } = useTaskLinkedIssues()

	const actionsTypes = useMemo(
		() => [
			{
				name: translate("taskDetailsScreen.blocks"),
				value: TaskRelatedIssuesRelationEnum.BLOCKS,
			},
			{
				name: translate("taskDetailsScreen.clones"),
				value: TaskRelatedIssuesRelationEnum.CLONES,
			},
			{
				name: translate("taskDetailsScreen.duplicates"),
				value: TaskRelatedIssuesRelationEnum.DUPLICATES,
			},
			{
				name: translate("taskDetailsScreen.isBlockedBy"),
				value: TaskRelatedIssuesRelationEnum.IS_BLOCKED_BY,
			},
			{
				name: translate("taskDetailsScreen.isClonedBy"),
				value: TaskRelatedIssuesRelationEnum.IS_CLONED_BY,
			},
			{
				name: translate("taskDetailsScreen.isDuplicatedBy"),
				value: TaskRelatedIssuesRelationEnum.IS_DUPLICATED_BY,
			},
			{
				name: translate("taskDetailsScreen.relatesTo"),
				value: TaskRelatedIssuesRelationEnum.RELATES_TO,
			},
		],

		[],
	)

	const actionTypeItems = useMemo(() => mapToActionType(actionsTypes), [actionsTypes])

	const relatedToItem = useMemo(
		() => actionTypeItems.find((t) => t.key === defaultValue),
		[actionTypeItems, defaultValue],
	)

	const [actionType, setActionType] = useState<ActionTypeItem | null>(relatedToItem || null)

	const onChange = useCallback(
		async (item: ActionTypeItem) => {
			if (!issue || !item.data?.value) {
				return
			}
			setActionType(item)

			const updatedAction = {
				...issue,
				action: item.data?.value,
			}
			await updateTaskLinkedIssue(updatedAction)
		},
		[setActionType, issue],
	)

	return {
		actionTypeItems,
		actionType,
		onChange,
	}
}

const styles = StyleSheet.create({
	button: {
		borderBottomColor: "#00000014",
		borderBottomWidth: 1,
		flexDirection: "column",
		marginBottom: 10,
		paddingVertical: 5,
	},
	labelText: {
		fontSize: 16,
	},
	selectedLabelText: {
		fontSize: 10,
	},
	taskStatus: { borderRadius: 3, minHeight: 20, width: 80 },
})
