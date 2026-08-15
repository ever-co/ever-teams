export interface ToolbarSectionProps {
	title: string;
	children: React.ReactNode;
	props?: string[];
	summary?: (props: Record<string, any>) => React.ReactNode;
}

export interface ToolbarItemProps {
	prefix?: string;
	label?: string;
	full?: boolean;
	propKey: string;
	index?: number;
	children?: React.ReactNode;
	type: 'text' | 'color' | 'bg' | 'number' | 'select' | 'slider';
	onChange?: (value: any) => any;
}

export interface ToolbarTextInputProps {
	prefix?: string;
	label?: string;
	type: 'text' | 'color' | 'bg' | 'number';
	onChange?: (value: any) => void;
	value?: any;
}

export interface ToolbarDropdownProps {
	title: string;
	value: string;
	onChange: (value: string) => void;
	children: React.ReactNode;
}

export interface RGBAColor {
	r: number;
	g: number;
	b: number;
	a: number;
}
