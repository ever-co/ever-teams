/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useRef, useEffect } from "react"
import { View, TouchableOpacity, Animated, Easing, StyleSheet } from "react-native"
import { SvgXml } from "react-native-svg"
import {
	moonDarkLarge,
	moonLightLarge,
	sunDarkLarge,
	sunLightLarge,
} from "../../../../components/svgs/icons"

interface IToggleThemeAnimation {
	toggleTheme: () => void
	isDark: boolean
}

const ToggleThemeAnimation: FC<IToggleThemeAnimation> = ({ isDark, toggleTheme }) => {
	const toggleAnimation = useRef(new Animated.Value(0)).current
	const fadeAnimation = useRef(new Animated.Value(0)).current

	const toggleSwitch = () => {
		Animated.parallel([
			Animated.timing(toggleAnimation, {
				toValue: isDark ? 0 : 1,
				duration: 200,
				easing: Easing.linear,
				useNativeDriver: false,
			}),
			Animated.timing(fadeAnimation, {
				toValue: isDark ? 1 : 0, // Toggle opacity from 0 to 1 or 1 to 0
				duration: 80,
				easing: Easing.linear,
				useNativeDriver: false,
			}),
		]).start()

		toggleTheme()
	}

	useEffect(() => {
		// Initialize animations based on the initial state

		toggleAnimation.setValue(isDark ? 1 : 0)
		fadeAnimation.setValue(isDark ? 0 : 1) // Start with opacity 0 for moon when isDark is true
	}, [])

	const moonToSun = toggleAnimation.interpolate({
		inputRange: [0, 1],
		outputRange: [0, 40], // Adjust as needed
	})

	const sunTransform = [
		{
			translateX: moonToSun,
		},
	]

	const sunOpacity = fadeAnimation.interpolate({
		inputRange: [0, 1],
		outputRange: [1, 0], // Fade out when transitioning from moon to sun
	})
	const moonLightOpacity = Animated.subtract(1, sunOpacity)

	return (
		<TouchableOpacity style={styles.toggle} onPress={toggleSwitch}>
			<View style={[styles.iconsContainer, { backgroundColor: isDark ? "#1b2228" : "#e9e9eb" }]}>
				<Animated.View
					style={[
						styles.iconWrapper,
						{ backgroundColor: isDark ? "transparent" : "white", transform: sunTransform },
					]}
				>
					{isDark ? <SvgXml xml={moonDarkLarge} /> : <SvgXml xml={sunLightLarge} />}
				</Animated.View>

				<Animated.View
					style={{
						position: "absolute",
						left: 3,
						opacity: sunOpacity, // Apply opacity animation
					}}
				>
					<SvgXml xml={sunDarkLarge} />
				</Animated.View>
				<Animated.View
					style={{
						position: "absolute",
						right: 11,
						opacity: moonLightOpacity,
					}}
				>
					<SvgXml xml={moonLightLarge} />
				</Animated.View>
			</View>
		</TouchableOpacity>
	)
}

export default ToggleThemeAnimation

const styles = StyleSheet.create({
	iconWrapper: { borderRadius: 60, padding: 7 },
	iconsContainer: {
		alignItems: "center",
		borderRadius: 100,
		display: "flex",
		flexDirection: "row",
		height: "100%",
		justifyContent: "space-between",
		paddingLeft: 4,
		paddingRight: 4,
		width: "100%",
	},
	toggle: {
		borderRadius: 60,
		height: 40,
		right: 0,
		top: 3,
		width: 86,
	},
})
