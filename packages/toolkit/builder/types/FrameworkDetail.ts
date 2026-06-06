export interface DocumentSectionProps {
	title: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}

export interface QuickNavProps {
	links: {
		href: string;
		label: string;
	}[];
}

export interface DocCTAProps {
	title: string;
	description: string;
	buttonText: string;
	buttonHref: string;
}

export interface ComponentExampleProps {
	title: string;
	description?: string;
	code: string;
	children: React.ReactNode;
}
