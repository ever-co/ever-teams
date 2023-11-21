import React, { useEffect } from 'react';
import { ImageStyle, Pressable, PressableProps, TextStyle, ViewStyle } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { AnimateStyle, AnimatedStyleProp, SharedValue } from 'react-native-reanimated';
import { isRTL } from '../../i18n';
import { colors, spacing } from '../../theme';

interface DrawerIconButtonProps extends PressableProps {
	open: boolean;
	progress: SharedValue<number>;
}

const AnimatedPressible = Animated.createAnimatedComponent(Pressable);

export function DrawerIconButton(props: DrawerIconButtonProps) {
	const { open, progress, ...PressableProps } = props;

	const animatedContainerStyles = useAnimatedStyle(() => {
		const translateX = interpolate(progress.value, [0, 1], [0, isRTL ? 60 : -60]);

		return {
			transform: [{ translateX }]
		} as AnimatedStyleProp<ViewStyle | ImageStyle | TextStyle>;
	});

	const animatedTopBarStyles = useAnimatedStyle(() => {
		const backgroundColor = interpolateColor(progress.value, [0, 1], [colors.text, colors.tint]);
		const marginLeft = interpolate(progress.value, [0, 1], [0, -11.5]);
		const rotate = interpolate(progress.value, [0, 1], [0, isRTL ? 45 : -45]);
		const marginBottom = interpolate(progress.value, [0, 1], [0, -2]);
		const width = interpolate(progress.value, [0, 1], [18, 12]);

		return {
			backgroundColor,
			marginLeft,
			marginBottom,
			width,
			transform: [{ rotate: `${rotate}deg` }]
		} as AnimateStyle<TextStyle>;
	});

	const animatedMiddleBarStyles = useAnimatedStyle(() => {
		const backgroundColor = interpolateColor(progress.value, [0, 1], [colors.text, colors.tint]);
		const width = interpolate(progress.value, [0, 1], [18, 16]);

		return {
			backgroundColor,
			width
		};
	});

	const animatedBottomBarStyles = useAnimatedStyle(() => {
		const marginTop = interpolate(progress.value, [0, 1], [4, 2]);
		const backgroundColor = interpolateColor(progress.value, [0, 1], [colors.text, colors.tint]);
		const marginLeft = interpolate(progress.value, [0, 1], [0, -11.5]);
		const rotate = interpolate(progress.value, [0, 1], [0, isRTL ? -45 : 45]);
		const width = interpolate(progress.value, [0, 1], [18, 12]);

		return {
			backgroundColor,
			marginLeft,
			width,
			marginTop,
			transform: [{ rotate: `${rotate}deg` }]
		} as AnimateStyle<TextStyle>;
	});

	useEffect(() => {
		progress.value = withSpring(open ? 1 : 0);
	}, [open, progress]);

	return (
		<AnimatedPressible {...PressableProps} style={[$container, animatedContainerStyles]}>
			<Animated.View style={[$topBar, animatedTopBarStyles] as AnimateStyle<ViewStyle>} />

			<Animated.View style={[$middleBar, animatedMiddleBarStyles]} />

			<Animated.View style={[$bottomBar, animatedBottomBarStyles] as AnimateStyle<ViewStyle>} />
		</AnimatedPressible>
	);
}

const barHeight = 2;

const $container: ViewStyle = {
	alignItems: 'center',
	height: 56,
	justifyContent: 'center',
	width: 56
};

const $topBar: ViewStyle = {
	height: barHeight
};

const $middleBar: ViewStyle = {
	height: barHeight,
	marginTop: spacing.tiny
};

const $bottomBar: ViewStyle = {
	height: barHeight
};

// @demo remove-file
