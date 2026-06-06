export interface PlasmicStorageHook {
	plasmicApiKey: string;
	projectId: string;
	updateStorage: (key: string, value: string) => void;
	setPlasmicApiKey: (value: string) => void;
	setProjectId: (value: string) => void;
}

export interface FormProps {
	onSubmit: (value: string) => void;
}

export interface DisplayProps {
	value: string;
	onReset: () => void;
	label: string;
}
