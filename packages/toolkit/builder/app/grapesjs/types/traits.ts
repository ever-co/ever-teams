import { Theme } from 'theme-ui';

export type TraitType = 'number' | 'boolean' | 'text' | 'checkbox' | 'select';

export interface TraitOption {
	id?: string;
	value: string;
	name: string;
}

export interface ComponentTrait {
	type: TraitType;
	label: string;
	name: string;
	changeProp?: number;
	options?: TraitOption[];
	default?: unknown;
	required?: boolean;
}

export interface ExportedTrait {
	type: string;
	label: string;
	name: string;
	value: any;
	options?: Array<{ value: string; name: string }>;
}
