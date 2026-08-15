import { useEditor, useNode } from '@craftjs/core';
import React, { useState } from 'react';
import { EditBar } from '../../editbar';
import { ActiveBorder } from '../../active-border';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectDropdownDefaultProps } from '../_constants/form';
import { selectDropdownEditbarConfig } from '../config/form';
import filterMargin from '../../../hooks/use-margin-padding';
import { SelectOption } from '../../../types/editor-config';

export const SelectDropdownComp = ({
	label,
	list,
	color,
	backgroundColor,
	icon,
	margin,
	padding,
	align,
	...props
}: typeof SelectDropdownDefaultProps) => {
	const {
		connectors: { connect, drag },
		id,
		actions: { setProp }
	} = useNode((state) => ({
		selected: state.events.selected,
		dragged: state.events.dragged
	}));
	const { actions } = useEditor();
	const [selectedValue, setSelectedValue] = useState(label);

	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

	const handleSelect = (value: string) => {
		try {
			// Try to parse if it's a JSON string
			const parsed = JSON.parse(value);
			const selectedOption = list.find(item => item?.value === parsed);

			// Update the display label if the option exists
			if (selectedOption) {
				setSelectedValue(selectedOption.label || 'Unknown');
				setProp((props: any) => {
					props.selectedValue = parsed;
				}, 500);
			}
		} catch (e) {
			// If not a valid JSON string, use directly
			setSelectedValue(value);
			setProp((props: any) => {
				props.selectedValue = value;
			}, 500);
		}
	};

	// Make sure at least one option exists
	const safeList = list.length > 0 ? list : [{ label: 'Option 1', value: 'option1' }];

	return (
		<div
			className={cn('relative w-full z-50 flex')}
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref))
				}
			}}
			style={{
				justifyContent: align,
				margin: filterMargin(margin),
				padding: filterMargin(padding)
			}}
			onClick={() => {
				actions.selectNode(id);
			}}
		>
			<ActiveBorder active={hoveredId == id} id={id}>
				<Select
					value={String(selectedValue)}
					onValueChange={handleSelect}
				>
					<SelectTrigger
						className="min-w-[180px] transition-colors duration-200 focus:ring-primary"
						style={{
							color: color,
							backgroundColor: backgroundColor,
							borderRadius: props.borderRadius ? `${props.borderRadius}px` : '0.375rem',
							borderColor: props.borderColor || '#e2e8f0',
							borderWidth: props.borderWidth ? `${props.borderWidth}px` : '1px',
							boxShadow: props.shadow ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
							opacity: props.opacity ? props.opacity / 100 : 1
						}}
						icon={icon}
					>
						<SelectValue placeholder={label}>{selectedValue}</SelectValue>
					</SelectTrigger>
					<SelectContent
						className="max-h-60 overflow-y-auto"
						style={{
							backgroundColor,
							color
						}}
					>
						<SelectGroup>
							{safeList.map((option) => (
								option ? (
									<SelectItem
										key={String(option.value) || 'none'}
										value={JSON.stringify(option.value) || ''}
										className="cursor-pointer hover:bg-primary/10 transition-colors"
									>
										{option.label || 'Unknown'}
									</SelectItem>
								) : (
									<SelectItem key={'none'} value={''}>
										Unknown
									</SelectItem>
								)
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</ActiveBorder>
		</div>
	);
};

const SelectDropdownSettings = () => {
	return (
		<>
			<EditBar config={selectDropdownEditbarConfig} />
		</>
	);
};

// Update default props to include new properties
SelectDropdownComp.craft = {
	props: {
		...SelectDropdownDefaultProps,
		selectedValue: '',
		borderRadius: 4,
		borderColor: '#e2e8f0',
		borderWidth: 1,
		shadow: false,
		opacity: 100
	},
	related: {
		settings: SelectDropdownSettings
	}
};
