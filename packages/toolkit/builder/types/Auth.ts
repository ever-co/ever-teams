import { TPasswordLoginForm, useTokenSubmission } from '@ever-teams/atoms';

export interface AuthFormProps {
	form: TPasswordLoginForm;
	onSwitch: () => void;
}

export interface TokenFormProps {
	form: ReturnType<typeof useTokenSubmission>;
	onSwitch: () => void;
}

export interface LoadingScreenProps {
	message?: string;
	description?: string;
}
