import { LucideProps } from 'lucide-react';
import React from 'react';

// Basic types
export type SelectOption = {
	label: string;
	value: string | number;
	disabled?: boolean;
};

// Base configuration type
export type BaseConfigItem = {
	property: string;
	label: string;
	type: 'text' | 'switch' | 'textarea' | 'divider' | 'color' | 'spacing';
	condition?: { key: string; value: any };
};

// Number input configuration
export type NumberConfigItem = {
	type: 'number';
	label: string;
	property: string;
	options: {
		min: number;
		max: number;
	};
};

// Field array configuration
export type FieldArrayConfigItem = {
	type: 'fieldArray';
	property: string;
	list: SelectOption[];
	label: string;
};

// Toggle configuration
export type ToggleConfigItem = {
	type: 'toggle';
	label: string;
	property: string;
	list: {
		Icon: React.FC<LucideProps>;
		value: string;
	}[];
};

// Select dropdown configuration
export type SelectConfigItem = {
	type: 'select';
	onChange?: (value: any) => void;
	property: string;
	label: string;
	list: SelectOption[];
};

// Slider configuration
export type SliderConfigItem = {
	type: 'slider';
	min?: number;
	max?: number;
	property: string;
	label: string;
	step?: number;
};

// Image upload configuration
export type ImageFormats = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml' | 'image/gif' | 'image/jpg';

export type ImageConfigItem = {
	type: 'image';
	property: string;
	label: string;
	sizeLimit: number;
	validFormats: ImageFormats[];
};

// Combined config item type
export type ConfigItem =
	| BaseConfigItem
	| NumberConfigItem
	| FieldArrayConfigItem
	| ToggleConfigItem
	| SelectConfigItem
	| SliderConfigItem
	| ImageConfigItem;

// Props for the editor configuration component
export type EditorConfigProps = {
	config: ConfigItem[];
	className?: string;
};
