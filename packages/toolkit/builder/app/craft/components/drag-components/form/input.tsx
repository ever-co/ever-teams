import { Input } from '@/components/ui/input';
import { useEditor, useNode } from '@craftjs/core';
import React, { useState, useEffect } from 'react';
// import { ActiveBorder } from '../active-border';
import { EditBar } from '../../editbar';
import { InputDefaultProps } from '../_constants/form';
import { inputEditbarConfig } from '../config/form';
import filterMargin from '../../../hooks/use-margin-padding';
import { cn } from '@/lib/utils';

type TextAlignType = 'left' | 'center' | 'right' | 'justify';

export const InputDrag = ({
	fontSize,
	placeholder,
	inputType,
	color,
	showLabel,
	label,
	labelPosition,
	labelSize,
	labelColor,
	labelWeight,
	required,
	...props
}: typeof InputDefaultProps) => {
	const {
		connectors: { connect, drag },
		selected,
		id,
		actions: { setProp }
	} = useNode((state) => ({
		selected: state.events.selected,
		dragged: state.events.dragged
	}));

	const [editable, setEditable] = useState(false);

	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;
	useEffect(() => {
		if (selected) {
			return;
		}

		setEditable(false);
	}, [selected]);

	const getTextAlign = (align: string | undefined): TextAlignType => {
		if (align === 'center' || align === 'right' || align === 'justify') {
			return align;
		}
		return 'left';
	};

	const placeholderClass = `input-drag-${id}`;

	const placeholderFontSize = Math.max(14, Math.round(fontSize * 0.85));

	// const customStyles = `
	// 	.${placeholderClass}::placeholder {
	// 		font-size: ${placeholderFontSize}px !important;
	// 		color: #6b7280 !important;
	// 		opacity: 0.65 !important;
	// 		font-style: italic !important;
	// 	}
	// `;

	const shouldShowLabel = showLabel === true;

	// Apply custom styles only when they differ from shadcn defaults
	const getCustomInputStyles = () => {
		const styles: React.CSSProperties = {};

		if (fontSize && fontSize !== 14) styles.fontSize = `${fontSize}px`;
		if (color && color !== '#000000') styles.color = color;
		if (props.align && props.align !== 'left') styles.textAlign = getTextAlign(props.align);
		if (props.opacity && props.opacity !== 100) styles.opacity = props.opacity / 100;
		if (props.margin) styles.margin = filterMargin(props.margin);
		if (props.padding) styles.padding = filterMargin(props.padding);

		// Only add these if custom values are specified
		if (props.borderRadius && props.borderRadius !== 6)
			styles.borderRadius = `${props.borderRadius}px`;
		if (props.borderColor && props.borderColor !== '#e2e8f0')
			styles.borderColor = props.borderColor;
		if (props.borderWidth && props.borderWidth !== 1)
			styles.borderWidth = `${props.borderWidth}px`;
		if (props.backgroundColor && props.backgroundColor !== 'white')
			styles.background = props.backgroundColor;
		if (props.shadow)
			styles.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';

		return styles;
	};

	return (
		<span
			{...props}
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref))
				}
			}}
			onClick={() => selected && setEditable(true)}
		>
			{/* <style>{customStyles}</style> */}
			{/* <ActiveBorder active={hoveredId == id} id={id}> */}
			<div className={cn(
				"w-full",
				labelPosition === 'left' && "flex items-center gap-3",
				labelPosition === 'right' && "flex flex-row-reverse items-center gap-3"
			)}>
				{shouldShowLabel && labelPosition === 'top' && (
					<div className="mb-2 text-left w-full" style={{
						fontSize: `${labelSize}px`,
						color: labelColor,
						fontWeight: labelWeight
					}}>
						{label}
						{required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
					</div>
				)}

				{shouldShowLabel && (labelPosition === 'left' || labelPosition === 'right') && (
					<div className="shrink-0" style={{
						fontSize: `${labelSize}px`,
						color: labelColor,
						fontWeight: labelWeight
					}}>
						{label}
						{required && <span style={{ color: 'red', marginLeft: '4px' }}>*</span>}
					</div>
				)}

				<div className={labelPosition !== 'top' ? "flex-1" : ""}>
					<Input
						onChange={(e) =>
							setProp((props: any) => (props.text = e.target.value.replace(/<\/?[^>]+(>|$)/g, '')), 500)
						}
						className={cn(
							"w-full transition-all duration-200 rounded-md",
							placeholderClass
						)}
						type={inputType}
						placeholder={placeholder}
						required={required}
						style={{
							...getCustomInputStyles(),
							border: '1px solid #d4d4d8',
							boxShadow: 'none'
						}}
					/>
				</div>
			</div>
			{/* </ActiveBorder> */}
		</span>
	);
};

const InputSettings = () => {
	return (
		<>
			<EditBar config={inputEditbarConfig} />
		</>
	);
};

InputDrag.craft = {
	props: {
		...InputDefaultProps,
		showLabel: true,
	},
	related: {
		settings: InputSettings
	}
};
