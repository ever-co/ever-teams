import React, { useMemo } from "react"
import { View } from "react-native"
import { SvgUri } from "react-native-svg"
import { useTaskLabels } from "../services/hooks/features/useTaskLabels"
import { useTaskPriority } from "../services/hooks/features/useTaskPriority"
import { useTaskSizes } from "../services/hooks/features/useTaskSizes"
import { useTaskStatus } from "../services/hooks/features/useTaskStatus"
import { ITaskStatusItem } from "../services/interfaces/ITaskStatus"

export type TStatusItem = {
	bgColor?: string
	icon?: React.ReactNode | undefined
	name?: string
	value?: string
	bordered?: boolean
}

export type TStatus<T extends string> = {
	[k in T]: TStatusItem
}

export function useMapToTaskStatusValues<T extends ITaskStatusItem>(
	data: T[],
	bordered = false,
): TStatus<any> {
	return useMemo(() => {
		return data.reduce((acc, item) => {
			const value: TStatus<any>[string] = {
				name: item.name?.split("-").join(" "),
				value: item.value || item.name,
				bgColor: item.color,
				bordered,
				icon: (
					<View>
						{item.fullIconUrl && <SvgUri width={14} height={14} uri={item.fullIconUrl} />}
					</View>
				),
			}

			if (value.name) {
				acc[value.name] = value
			} else if (value.value) {
				acc[value.value] = value
			}
			return acc
		}, {} as TStatus<any>)
	}, [data, bordered])
}

// ==================== Task Status ========================================
export function useTaskStatusValue() {
	const { allStatuses } = useTaskStatus()
	return useMapToTaskStatusValues(allStatuses)
}

// =================== Task Size ==============================================
export function useTaskSizeValue() {
	const { allTaskSizes } = useTaskSizes()
	return useMapToTaskStatusValues(allTaskSizes)
}

// =================== Task Label ==============================================
export function useTaskLabelValue() {
	const { allTaskLabels } = useTaskLabels()
	return useMapToTaskStatusValues(allTaskLabels)
}

// =================== Task Priority ==============================================
export function useTaskPriorityValue() {
	const { allTaskPriorities } = useTaskPriority()
	return useMapToTaskStatusValues(allTaskPriorities)
}
