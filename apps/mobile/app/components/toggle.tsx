import React, { ComponentType, FC, useEffect, useMemo, useRef, useState } from 'react';
import {
	GestureResponderEvent,
	Image,
	ImageStyle,
	StyleProp,
	SwitchProps,
	TextInputProps,
	TextStyle,
	TouchableOpacity,
	TouchableOpacityProps,
	View,
	ViewStyle
} from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { colors, spacing } from '../theme';
import { iconRegistry } from './icon';
import { Text, TextProps } from './text';

type Variants = 'checkbox' | 'switch' | 'radio';

export interface ToggleProps extends Omit<TouchableOpacityProps, 'style'> {
	/**
	 * The variant of the toggle.
	 * Options: "checkbox", "switch", "radio"
	 * Default: "checkbox"
	 */
	variant?: Variants;
	/**
	 * A style modifier for different input states.
	 */
	status?: 'error' | 'disabled';
	/**
	 * If false, input is not editable. The default value is true.
	 */
	editable?: TextInputProps['editable'];
	/**
	 * The value of the field. If true the component will be turned on.
	 */
	value?: boolean;
	/**
	 * Invoked with the new value when the value changes.
	 */
	onValueChange?: SwitchProps['onValueChange'];
	/**
	 * Style overrides for the container
	 */
	containerStyle?: StyleProp<ViewStyle>;
	/**
	 * Style overrides for the input wrapper
	 */
	inputWrapperStyle?: StyleProp<ViewStyle>;
	/**
	 * Optional input wrapper style override.
	 * This gives the inputs their size, shape, "off" background-color, and outer border.
	 */
	inputOuterStyle?: ViewStyle;
	/**
	 * Optional input style override.
	 * This gives the inputs their inner characteristics and "on" background-color.
	 */
	inputInnerStyle?: ViewStyle;
	/**
	 * Optional input detail style override.
	 * For checkbox, this affects the Image component.
	 * For radio, this affects the dot View.
	 * For switch, this affects the knob View.
	 */
	inputDetailStyle?: ViewStyle & ImageStyle;
	/**
	 * The position of the label relative to the action component.
	 * Default: right
	 */
	labelPosition?: 'left' | 'right';
	/**
	 * The label text to display if not using `labelTx`.
	 */
	label?: TextProps['text'];
	/**
	 * Label text which is looked up via i18n.
	 */
	labelTx?: TextProps['tx'];
	/**
	 * Optional label options to pass to i18n. Useful for interpolation
	 * as well as explicitly setting locale or translation fallbacks.
	 */
	labelTxOptions?: TextProps['txOptions'];
	/**
	 * Style overrides for label text.
	 */
	labelStyle?: StyleProp<TextStyle>;
	/**
	 * Pass any additional props directly to the label Text component.
	 */
	LabelTextProps?: TextProps;
	/**
	 * The helper text to display if not using `helperTx`.
	 */
	helper?: TextProps['text'];
	/**
	 * Helper text which is looked up via i18n.
	 */
	helperTx?: TextProps['tx'];
	/**
	 * Optional helper options to pass to i18n. Useful for interpolation
	 * as well as explicitly setting locale or translation fallbacks.
	 */
	helperTxOptions?: TextProps['txOptions'];
	/**
	 * Pass any additional props directly to the helper Text component.
	 */
	HelperTextProps?: TextProps;
	/**
	 * Special prop for the switch variant that adds a text/icon label for on/off states.
	 */
	switchAccessibilityMode?: 'text' | 'icon';
}

interface ToggleInputProps {
	on: boolean;
	status: ToggleProps['status'];
	disabled: boolean;
	outerStyle: ViewStyle;
	innerStyle: ViewStyle;
	detailStyle: ViewStyle & ImageStyle;
	switchAccessibilityMode?: ToggleProps['switchAccessibilityMode'];
}

/**
 * Renders a boolean input.
 * This is a controlled component that requires an onValueChange callback that updates the value prop in order for the component to reflect user actions. If the value prop is not updated, the component will continue to render the supplied value prop instead of the expected result of any user actions.
 *
 * - [Documentation and Examples](https://github.com/infinitered/ignite/blob/master/docs/Components-Toggle.md)
 */
export function Toggle(props: ToggleProps) {
	const {
		variant = 'checkbox',
		editable = true,
		status,
		value,
		onPress,
		onValueChange,
		labelPosition = 'right',
		helper,
		helperTx,
		helperTxOptions,
		HelperTextProps,
		containerStyle: $containerStyleOverride,
		inputWrapperStyle: $inputWrapperStyleOverride,
		...WrapperProps
	} = props;

	const disabled = editable === false || status === 'disabled';

	const Wrapper = useMemo<ComponentType<TouchableOpacityProps>>(
		() => (disabled ? View : TouchableOpacity),
		[disabled]
	);
	const ToggleInput = useMemo(() => ToggleInputs[variant] || (() => null), [variant]);

	const $containerStyles = [$containerStyleOverride];
	const $inputWrapperStyles = [$inputWrapper, $inputWrapperStyleOverride];
	const $helperStyles = [$helper, status === 'error' && { color: colors.error }, HelperTextProps?.style];

	function handlePress(e: GestureResponderEvent) {
		if (disabled) return;
		onValueChange?.(!value);
		onPress?.(e);
	}

	return (
		<Wrapper
			activeOpacity={1}
			accessibilityRole={variant}
			accessibilityState={{ checked: value, disabled }}
			{...WrapperProps}
			style={$containerStyles}
			onPress={handlePress}
		>
			<View style={$inputWrapperStyles}>
				{labelPosition === 'left' && <FieldLabel {...props} labelPosition={labelPosition} />}

				<ToggleInput
					on={value}
					disabled={disabled}
					status={status}
					outerStyle={props.inputOuterStyle}
					innerStyle={props.inputInnerStyle}
					detailStyle={props.inputDetailStyle}
					switchAccessibilityMode={props.switchAccessibilityMode}
				/>

				{labelPosition === 'right' && <FieldLabel {...props} labelPosition={labelPosition} />}
			</View>

			{!!(helper || helperTx) && (
				<Text
					preset="formHelper"
					text={helper}
					tx={helperTx}
					txOptions={helperTxOptions}
					{...HelperTextProps}
					style={$helperStyles}
				/>
			)}
		</Wrapper>
	);
}

const ToggleInputs: Record<Variants, FC<ToggleInputProps>> = {
	checkbox: Checkbox,
	switch: Switch,
	radio: Radio
};

function Checkbox(props: ToggleInputProps) {
	const {
		on,
		status,
		disabled,
		outerStyle: $outerStyleOverride,
		innerStyle: $innerStyleOverride,
		detailStyle: $detailStyleOverride
	} = props;

	const offBackgroundColor = [
		disabled && colors.palette.neutral400,
		status === 'error' && colors.errorBackground,
		colors.palette.neutral200
	].filter(Boolean)[0];

	const outerBorderColor = [
		disabled && colors.palette.neutral400,
		status === 'error' && colors.error,
		!on && colors.palette.neutral800,
		colors.palette.secondary500
	].filter(Boolean)[0];

	const onBackgroundColor = [
		disabled && colors.transparent,
		status === 'error' && colors.errorBackground,
		colors.palette.secondary500
	].filter(Boolean)[0];

	const iconTintColor = [
		disabled && colors.palette.neutral600,
		status === 'error' && colors.error,
		colors.palette.accent100
	].filter(Boolean)[0];

	return (
		<View
			style={[
				$inputOuterVariants.checkbox,
				{ backgroundColor: offBackgroundColor, borderColor: outerBorderColor },
				$outerStyleOverride
			]}
		>
			<Animated.View
				style={[
					$checkboxInner,
					{ backgroundColor: onBackgroundColor },
					$innerStyleOverride,
					useAnimatedStyle(() => ({ opacity: withTiming(on ? 1 : 0) }), [on])
				]}
			>
				<Image
					source={iconRegistry.check}
					style={[$checkboxDetail, { tintColor: iconTintColor }, $detailStyleOverride]}
				/>
			</Animated.View>
		</View>
	);
}

function Radio(props: ToggleInputProps) {
	const {
		on,
		status,
		disabled,
		outerStyle: $outerStyleOverride,
		innerStyle: $innerStyleOverride,
		detailStyle: $detailStyleOverride
	} = props;

	const offBackgroundColor = [
		disabled && colors.palette.neutral400,
		status === 'error' && colors.errorBackground,
		colors.palette.neutral200
	].filter(Boolean)[0];

	const outerBorderColor = [
		disabled && colors.palette.neutral400,
		status === 'error' && colors.error,
		!on && colors.palette.neutral800,
		colors.palette.secondary500
	].filter(Boolean)[0];

	const onBackgroundColor = [
		disabled && colors.transparent,
		status === 'error' && colors.errorBackground,
		colors.palette.neutral100
	].filter(Boolean)[0];

	const dotBackgroundColor = [
		disabled && colors.palette.neutral600,
		status === 'error' && colors.error,
		colors.palette.secondary500
	].filter(Boolean)[0];

	return (
		<View
			style={[
				$inputOuterVariants.radio,
				{ backgroundColor: offBackgroundColor, borderColor: outerBorderColor },
				$outerStyleOverride
			]}
		>
			<Animated.View
				style={[
					$radioInner,
					{ backgroundColor: onBackgroundColor },
					$innerStyleOverride,
					useAnimatedStyle(() => ({ opacity: withTiming(on ? 1 : 0) }), [on])
				]}
			>
				<View style={[$radioDetail, { backgroundColor: dotBackgroundColor }, $detailStyleOverride]} />
			</Animated.View>
		</View>
	);
}

function Switch(props: ToggleInputProps) {
	const {
		on,
		status,
		disabled,
		outerStyle: $outerStyleOverride,
		innerStyle: $innerStyleOverride,
		detailStyle: $detailStyleOverride
	} = props;

	const knob = useRef<Animated.View>(null);
	const [renderedKnobWidth, setRenderedKnobWidth] = useState(null);

	useEffect(() => {
		// measure knob subsquently if the override changes
		if (!knob.current) return;
		if (renderedKnobWidth === null) return;
		knob.current.measure((_x, _y, width) => setRenderedKnobWidth(width));
	}, [$detailStyleOverride?.width]);

	const offBackgroundColor = [
		disabled && colors.palette.neutral400,
		status === 'error' && colors.errorBackground,
		colors.palette.neutral300
	].filter(Boolean)[0];

	const onBackgroundColor = [
		disabled && colors.transparent,
		status === 'error' && colors.errorBackground,
		colors.palette.secondary500
	].filter(Boolean)[0];

	const knobBackgroundColor = (function () {
		if (on) {
			return [
				$detailStyleOverride?.backgroundColor,
				status === 'error' && colors.error,
				disabled && colors.palette.neutral600,
				colors.palette.neutral100
			].filter(Boolean)[0];
		} else {
			return [
				$innerStyleOverride?.backgroundColor,
				disabled && colors.palette.neutral600,
				status === 'error' && colors.error,
				colors.palette.neutral200
			].filter(Boolean)[0];
		}
	})();

	const $animatedSwitchKnob = useAnimatedStyle(() => {
		if (renderedKnobWidth === null) return {};

		const offsetLeft = ($innerStyleOverride?.paddingStart ||
			$innerStyleOverride?.paddingLeft ||
			$switchInner.paddingStart ||
			$switchInner.paddingLeft ||
			0) as number;

		const offsetRight = ($innerStyleOverride?.paddingEnd ||
			$innerStyleOverride?.paddingRight ||
			$switchInner.paddingEnd ||
			$switchInner.paddingRight ||
			0) as number;

		const start = withTiming(on ? '100%' : '0%');
		const marginStart = withTiming(on ? -(renderedKnobWidth || 0) - offsetRight : 0 + offsetLeft);

		return { start, marginStart };
	}, [on, renderedKnobWidth]);

	return (
		<View style={[$inputOuterVariants.switch, { backgroundColor: offBackgroundColor }, $outerStyleOverride]}>
			<Animated.View
				style={[
					$switchInner,
					{ backgroundColor: onBackgroundColor },
					$innerStyleOverride,
					useAnimatedStyle(() => ({ opacity: withTiming(on ? 1 : 0) }), [on])
				]}
			/>

			<SwitchAccessibilityLabel {...props} role="on" />
			<SwitchAccessibilityLabel {...props} role="off" />

			<Animated.View
				ref={knob}
				entering={FadeIn.delay(150).duration(150)}
				style={[
					$switchDetail,
					$animatedSwitchKnob,
					$detailStyleOverride,
					{ backgroundColor: knobBackgroundColor }
				]}
				onLayout={(e) => {
					// measure knob on load only once
					if (renderedKnobWidth !== null) return;
					setRenderedKnobWidth(e.nativeEvent.layout.width);
				}}
			/>
		</View>
	);
}

function SwitchAccessibilityLabel(props: ToggleInputProps & { role: 'on' | 'off' }) {
	const { on, disabled, status, switchAccessibilityMode, role, innerStyle, detailStyle } = props;

	if (!switchAccessibilityMode) return null;

	const shouldLabelBeVisible = (on && role === 'on') || (!on && role === 'off');

	const $switchAccessibilityStyle: ViewStyle[] = [
		$switchAccessibility,
		role === 'off' && { end: '5%' },
		role === 'on' && { left: '5%' }
	];

	const color = (function () {
		if (disabled) return colors.palette.neutral600;
		if (status === 'error') return colors.error;
		if (!on) return innerStyle?.backgroundColor || colors.palette.secondary500;
		return detailStyle?.backgroundColor || colors.palette.neutral100;
	})();

	return (
		<View style={$switchAccessibilityStyle}>
			{switchAccessibilityMode === 'text' && shouldLabelBeVisible && (
				<View
					style={[
						role === 'on' && $switchAccessibilityLine,
						role === 'on' && { backgroundColor: color },
						role === 'off' && $switchAccessibilityCircle,
						role === 'off' && { borderColor: color }
					]}
				/>
			)}

			{switchAccessibilityMode === 'icon' && shouldLabelBeVisible && (
				<Image
					style={[$switchAccessibilityIcon, { tintColor: color }]}
					source={role === 'off' ? iconRegistry.hidden : iconRegistry.view}
				/>
			)}
		</View>
	);
}

function FieldLabel(props: ToggleProps) {
	const {
		status,
		label,
		labelTx,
		labelTxOptions,
		LabelTextProps,
		labelPosition,
		labelStyle: $labelStyleOverride
	} = props;

	if (!label && !labelTx && !LabelTextProps?.children) return null;

	const $labelStyle = [
		$label,
		status === 'error' && { color: colors.error },
		labelPosition === 'right' && $labelRight,
		labelPosition === 'left' && $labelLeft,
		$labelStyleOverride,
		LabelTextProps?.style
	];

	return (
		<Text
			preset="formLabel"
			text={label}
			tx={labelTx}
			txOptions={labelTxOptions}
			{...LabelTextProps}
			style={$labelStyle}
		/>
	);
}

const $inputWrapper: ViewStyle = {
	flexDirection: 'row',
	alignItems: 'center'
};

const $inputOuterBase: ViewStyle = {
	height: 24,
	width: 24,
	borderWidth: 2,
	alignItems: 'center',
	overflow: 'hidden',
	flexGrow: 0,
	flexShrink: 0,
	justifyContent: 'space-between',
	flexDirection: 'row'
};

const $inputOuterVariants: Record<Variants, StyleProp<ViewStyle>> = {
	checkbox: [$inputOuterBase, { borderRadius: 4 }],
	radio: [$inputOuterBase, { borderRadius: 12 }],
	switch: [$inputOuterBase, { height: 32, width: 56, borderRadius: 16, borderWidth: 0 }]
};

const $checkboxInner: ViewStyle = {
	width: '100%',
	height: '100%',
	alignItems: 'center',
	justifyContent: 'center',
	overflow: 'hidden'
};

const $checkboxDetail: ImageStyle = {
	width: 20,
	height: 20,
	resizeMode: 'contain'
};

const $radioInner: ViewStyle = {
	width: '100%',
	height: '100%',
	alignItems: 'center',
	justifyContent: 'center',
	overflow: 'hidden'
};

const $radioDetail: ViewStyle = {
	width: 12,
	height: 12,
	borderRadius: 6
};

const $switchInner: ViewStyle = {
	width: '100%',
	height: '100%',
	alignItems: 'center',
	borderColor: colors.transparent,
	overflow: 'hidden',
	position: 'absolute',
	paddingStart: 4,
	paddingEnd: 4
};

const $switchDetail: ViewStyle = {
	borderRadius: 12,
	position: 'absolute',
	width: 24,
	height: 24
};

const $helper: TextStyle = {
	marginTop: spacing.extraSmall
};

const $label: TextStyle = {
	flex: 1
};

const $labelRight: TextStyle = {
	marginLeft: spacing.medium
};

const $labelLeft: TextStyle = {
	marginRight: spacing.medium
};

const $switchAccessibility: TextStyle = {
	width: '40%',
	justifyContent: 'center',
	alignItems: 'center'
};

const $switchAccessibilityIcon: ImageStyle = {
	width: 14,
	height: 14,
	resizeMode: 'contain'
};

const $switchAccessibilityLine: ViewStyle = {
	width: 2,
	height: 12
};

const $switchAccessibilityCircle: ViewStyle = {
	borderWidth: 2,
	width: 12,
	height: 12,
	borderRadius: 6
};
