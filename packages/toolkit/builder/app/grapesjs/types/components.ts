import { Theme } from 'theme-ui';
import { ComponentTrait, ExportedTrait } from './traits';
import React from 'react';
import { COMPONENT_CATEGORIES } from '../constants/component-defaults';
import { GrapesJSEditor } from './editor';

export interface ComponentDefinition {
	type: string;
	defaults?: ComponentDefaults;
	model?: Partial<ComponentModel>;
	view?: Partial<ComponentView>;
}

export interface RenderParams {
	el: HTMLElement;
	model: ComponentModel;
	theme: Theme;
}

export interface ComponentMapping {
	importPath: string;
	componentName: string;
	category: keyof typeof COMPONENT_CATEGORIES;
	inputs?: {
		name: string;
		importPath: string;
	};
}

export interface ComponentConfig {
	type: string;
	label: string;
	category: string;
	displayName?: string;
	content: string;
	image?: string;
	media?: string;
	defaults: ComponentDefaults;
	model?: Partial<ComponentModel>;
	view?: Partial<ComponentView>;
	handleRender?: (props: { el: HTMLElement; model: ComponentModel; theme: Theme }) => void;
	mapping: ComponentMapping;
}

export interface ComponentModel {
	defaults: ComponentDefaults;
	attributes: Record<string, unknown>;
	init?: () => void;
	handleChanges?: () => void;
	get: <T>(property: string) => T;
	set: (property: string | Record<string, any>, value?: any) => void;
	on: (event: string, callback: () => void) => void;
	trigger: (event: string) => void;
}

export interface ComponentDefaults {
	tagName: string;
	attributes: Record<string, string>;
	draggable: string;
	droppable: boolean;
	traits?: ComponentTrait[];
	mapping?: ComponentMapping;
}

export interface ComponentView {
	tagName: string;
	el: HTMLElement;
	model: ComponentModel;
	onRender?: (params: RenderParams) => void;
	render: () => ComponentView;
	remove: () => void;
	listenToEvents?: (el: HTMLElement) => void;
}

export interface ComponentTypeDefinition {
	defaults: ComponentDefaults;
	model: {
		defaults?: ComponentDefaults;
		attributes?: Record<string, unknown>;
		get?: <T>(property: string) => T;
		set?: (property: string | Record<string, any>, value?: any) => void;
		init?: () => void;
		handleChanges?: () => void;
		on?: (event: string, callback: () => void) => void;
		trigger?: (event: string) => void;
	};
	view?: {
		onRender?: (params: RenderParams) => void;
	};
}

export interface EditorProps {
	editor: GrapesJSEditor | null;
	chartData?: any;
}

export interface ITeamsModernTimerProps {
	separator: string;
	expandable: boolean;
	showProgress: boolean;
	style?: React.CSSProperties;
	size?: 'default' | 'sm' | 'lg' | null;
	variant?: 'default' | null;
	className?: string;
}

export interface ITeamsTimerButtonProps {
	size?: 'default' | 'sm' | 'lg';
	variant?: 'default' | 'bordered';
	style?: React.CSSProperties;
	className?: string;
}

export interface IReportDisplayer {
	workedTime?: number;
	icon?: string | null;
	label: string;
	user: string;
	maxWorkHours: number;
}

export interface IBasicTimerProps {
	background?: 'primary' | 'secondary' | 'destructive';
	color?: 'primary' | 'secondary' | 'destructive';
	border?: 'thick' | 'thin' | 'none';
	rounded?: 'large' | 'medium' | 'small' | 'none';
	className?: string;
}

export interface ITeamsEssentialTimerProps {
	readonly?: boolean;
	progress?: boolean;
	background?: 'primary' | 'secondary' | 'destructive';
	rounded?: 'none' | 'small' | 'medium' | 'large';
	color?: 'primary' | 'secondary' | 'destructive';
	icon?: boolean;
	border?: 'none' | 'thick' | 'thin';
	className?: string;
}

export type ChartType = 'bar' | 'bar-horizontal' | 'area' | 'pie' | 'line' | 'radar' | 'radial' | 'tooltip';
