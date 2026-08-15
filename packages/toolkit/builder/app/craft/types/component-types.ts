export interface ComponentDefinition {
	label: string;
	id: string;
	component: React.ReactElement;
	imageSrc?: string;
	customPreview?: React.ReactElement;
}

export interface ComponentSection {
	id: string;
	title: string;
	icon: React.ReactElement;
	components: ComponentDefinition[];
}

export interface CollapsibleSectionProps {
	title: string;
	icon: React.ReactNode;
	isExpanded: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}

export interface ComponentCardProps {
	label: string;
	id: string;
	dragProps: any;
	create: any;
	component: any;
	children: React.ReactNode;
}
