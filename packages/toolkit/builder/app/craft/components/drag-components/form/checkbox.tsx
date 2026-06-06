import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { EditBar } from '../../editbar';
import { ActiveBorder } from '../../active-border';
import { cn } from '@/lib/utils';
import { CheckboxDefaultProps } from '../_constants/form';
import { checkboxEditbarConfig } from '../config/form';
import { Check } from 'lucide-react';

export const CheckBoxComp = ({ ...props }: typeof CheckboxDefaultProps) => {
	const {
		connectors: { connect, drag },
		id,
		actions: { setProp }
	} = useNode((state) => ({
		selected: state.events.selected,
		dragged: state.events.dragged
	}));
	const { actions } = useEditor();

	const { hoveredNodeId } = useEditor((state) => ({
		hoveredNodeId: state.events
	}));
	const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

	// Helper function to calculate margin styles
	const getMarginStyle = (margin: any) => {
		if (margin.isMultiple) {
			return `${margin.t}px ${margin.r}px ${margin.b}px ${margin.l}px`;
		}
		return `${margin.all}px`;
	};

	// Helper function to calculate padding styles
	const getPaddingStyle = (padding: any) => {
		if (padding.isMultiple) {
			return `${padding.t}px ${padding.r}px ${padding.b}px ${padding.l}px`;
		}
		return `${padding.all}px`;
	};

	const handleCheckboxClick = () => {
		setProp((props: any) => (props.checked = !props.checked), 500);
	};

	return (
		<div
			{...props}
			className={cn('relative w-full z-50 flex')}
			ref={(ref) => {
				if (ref instanceof HTMLElement) {
					connect(drag(ref))
				}
			}}
			style={{
				justifyContent: props.align,
				margin: getMarginStyle(props.margin),
				padding: getPaddingStyle(props.padding)
			}}
			onClick={() => {
				actions.selectNode(id);
			}}
		>
			<ActiveBorder active={hoveredId == id} id={id}>
				<div className="flex items-center space-x-3 p-3 rounded-md hover:bg-primary/5 transition-colors">
					<div
						onClick={(e) => {
							e.stopPropagation();
							handleCheckboxClick();
						}}
						className={cn(
							"min-w-5 w-5 h-5 flex items-center justify-center cursor-pointer rounded border-2",
							props.checked
								? "bg-blue-600 border-blue-600"
								: "bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-500"
						)}
						style={{
							boxShadow: "0 0 0 1px rgba(0,0,0,0.05)"
						}}
					>
						{props.checked && (
							<Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
						)}
					</div>

					<div className="flex flex-col justify-center">
						<div
							className="font-medium text-foreground leading-none cursor-pointer select-none"
							onClick={(e) => {
								e.stopPropagation();
								handleCheckboxClick();
							}}
						>
							{props.title}
						</div>
						{!props.hideDescription && (
							<p className="text-sm text-muted-foreground mt-1.5">
								{props.description}
							</p>
						)}
					</div>
				</div>
			</ActiveBorder>
		</div>
	);
};

const CheckBoxSettings = () => {
	return (
		<>
			<EditBar config={checkboxEditbarConfig} />
		</>
	);
};

CheckBoxComp.craft = {
	props: CheckboxDefaultProps,

	related: {
		settings: CheckBoxSettings
	}
};
