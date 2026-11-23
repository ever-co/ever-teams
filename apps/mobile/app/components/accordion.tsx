/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native"
import React, { ReactElement, useState, useEffect } from "react"
import { ChevronDown, ChevronUp } from "../../src/components/icons"
import { typography, useWebTheme } from "../theme"
import { settingsDividerOf, settingsSurfaceOf } from "../../src/theme/settings-look"
import type { Theme } from "../../src/theme/use-theme"

interface IAccordion {
	title: string
	children: ReactElement | ReactElement[]
	titleFontSize?: number
	arrowSize?: number
	headerElement?: ReactElement
	setAccordionExpanded?: (isExpanded: boolean) => void
	/** A section inside another one draws no surface of its own. */
	nested?: boolean
}

const TITLE_SIZE = 14
const CHEVRON_SIZE = 16

/** A section on the web's surface, radius 14 inside a hairline; a nested one on its parent's. */
export function accordionSurfaceOf(nested: boolean, theme: Theme): ViewStyle {
	if (nested) {
		return {}
	}
	return settingsSurfaceOf(theme)
}

const Accordion: React.FC<IAccordion> = ({
	children,
	title,
	arrowSize,
	titleFontSize,
	headerElement,
	setAccordionExpanded,
	nested = false,
}) => {
	const [expanded, setExpanded] = useState(true)
	const theme = useWebTheme()

	function toggleItem() {
		setExpanded(!expanded)
		setAccordionExpanded && setAccordionExpanded(expanded)
	}

	useEffect(() => {
		setAccordionExpanded && setAccordionExpanded(expanded)
	}, [expanded])

	const body = <View style={{ gap: 12 }}>{children}</View>
	return (
		<View testID="accordion" style={[styles.accordContainer, accordionSurfaceOf(nested, theme)]}>
			<TouchableOpacity
				style={styles.accordHeader}
				onPress={toggleItem}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
			>
				<Text
					style={[
						styles.accordTitle,
						{ color: theme.colors.foreground, fontSize: titleFontSize || TITLE_SIZE },
					]}
				>
					{title}
				</Text>
				<View style={styles.headerEnd}>
					{headerElement}
					{expanded && (
						<ChevronUp size={arrowSize || CHEVRON_SIZE} color={theme.colors["muted-foreground"]} />
					)}
					{!expanded && (
						<ChevronDown size={arrowSize || CHEVRON_SIZE} color={theme.colors["muted-foreground"]} />
					)}
				</View>
			</TouchableOpacity>
			{expanded && <View testID="accordion-divider" style={[styles.divider, settingsDividerOf(theme)]} />}
			{expanded && body}
		</View>
	)
}

export default Accordion

const styles = StyleSheet.create({
	accordContainer: {
		marginVertical: 6,
		width: "100%",
	},
	accordHeader: {
		alignItems: "center",
		flexDirection: "row",
		justifyContent: "space-between",
		minHeight: 48,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	accordTitle: {
		fontFamily: typography.primary.semiBold,
	},
	divider: {
		marginBottom: 12,
		marginHorizontal: 16,
	},
	headerEnd: {
		alignItems: "center",
		flexDirection: "row",
		gap: 8,
	},
})
