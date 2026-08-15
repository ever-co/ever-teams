export interface BuilderContent {
	id: string;
	name: string;
	data: {
		title?: string;
		description?: string;
		url?: string;
	};
}

export interface BuilderPageProps {
	params: {
		page: string[];
	};
}

export interface ApiKeyFormProps {
	onSubmit: (key: string) => void;
}

export interface ApiKeyDisplayProps {
	apiKey: string;
	onReset: () => void;
}

export interface ContentPreviewProps {
	content: BuilderContent | null;
}

export interface BuilderContent {
	content?: {
		title?: string;
		description?: string;
		[key: string]: any;
	};
}

export interface BuilderPageClientProps {
	content: BuilderContent | null;
	builderModelName: string;
}

export interface MetaData {
	title: string;
	description: string;
}
