'use client';
import { IAuthLogin, IServerError } from '@ever-teams/toolkit-types';
import { useRef, useState } from 'react';

import { authSignInWorkspace, authWithEmailPassword } from '@ever-teams/api';
import { reportError, toast } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { useAccessToken } from './useAccessToken';
import { useTeamsContext } from '../context/teams-context';
import { kindOfFailedRequest, kindOfSignInFailure, SIGN_IN_ERROR_MESSAGE_KEYS } from '@lib/errors/kit-error';
import { errorMessageOf } from '@lib/context/teams-timer-status-context';
import { useKitOptions } from '@components/teams-provider/kit-options';
import { apiUrlOf } from '@lib/utils/api-url';
import { twoFactorChallengeOf } from '@lib/errors/two-factor';
import { useTwoFactorStep, type TwoFactorStep } from './useTwoFactorStep';
import { workspaceChoicesOf, type WorkspaceChoice } from '@lib/session/workspace-choices';

/** The workspace step, while an email and password that open several workspaces wait for the person's pick. */
export interface WorkspaceStep {
	choices: WorkspaceChoice[];
	// The token of the workspace being signed in to; null while the person has not picked one.
	choosing: string | null;
	error?: string;
	choose: (choice: WorkspaceChoice) => Promise<void>;
}

interface UsePasswordLoginFormReturn {
	formData: {
		email: string;
		password: string;
	};
	loading: boolean;
	error?: string;
	handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
	/** The code step, while the API waits for a two-factor code of this sign-in; null otherwise. */
	twoFactor: TwoFactorStep | null;
	/** The workspace step, when the email and password open several workspaces; null otherwise. */
	workspaces: WorkspaceStep | null;
	/** Leaves the code or workspace step for the email and password, which the form kept. */
	backToPassword: () => void;
}

interface UsePasswordLoginFormParams {
	redirectHandler?: () => void;
}

export const usePasswordLoginForm = ({ redirectHandler }: UsePasswordLoginFormParams): UsePasswordLoginFormReturn => {
	const [formData, setFormData] = useState({ email: '', password: '' });
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<undefined | string>(undefined);
	const { t } = useTranslation();
	const { setAccessToken } = useAccessToken();
	const { setToken, setAuthenticatedUser: setUser } = useTeamsContext();
	const { api } = useKitOptions();
	// Counts the edits: a failure that comes back after an edit is not shown, since the edit cleared the error.
	const edits = useRef(0);

	const completeSignIn = (session: IAuthLogin) => {
		setToken(session.token);
		setAccessToken(session.token);
		setUser(() => ({ data: session.user, loading: false }));
		redirectHandler && redirectHandler();
	};
	const twoFactor = useTwoFactorStep({ api, onSignedIn: completeSignIn });
	const [choices, setChoices] = useState<WorkspaceChoice[] | null>(null);
	const [choosing, setChoosing] = useState<string | null>(null);
	const [workspaceError, setWorkspaceError] = useState<string | undefined>(undefined);

	// What the form says of a refused sign-in. No answer (the API package returns it with no status), the site not
	// allowed, a missing permission or the API down: the kit's own words, inside the form and with no toast on the host
	// page. A wrong email or password: the kit's words too. Anything else: the API's text, also in a toast.
	const reportFailure = async (answer: IServerError, showError: (message: string) => void) => {
		const kind = await kindOfSignInFailure(answer, apiUrlOf(api));
		if (kind) {
			showError(t(SIGN_IN_ERROR_MESSAGE_KEYS[kind]));
			return;
		}
		if ('statusCode' in answer && answer.statusCode === 401) {
			showError(t('ERROR.invalid_password_or_email'));
			reportError(t('ERROR.invalid_password_or_email'));
			return;
		}
		const errorMessage = errorMessageOf(answer);
		showError(errorMessage);
		toast({
			variant: 'destructive',
			description: errorMessage
		});
	};

	// Signs in to one workspace of the list: the session, the code step of an account with two-factor sign-in on
	// (ever-co/ever-teams#5701), or the refusal in the form's words.
	const signInToWorkspace = async (choice: WorkspaceChoice, showError: (message: string) => void) => {
		const answer = await authSignInWorkspace({ email: formData.email, token: choice.token }, api);
		if ('token' in answer) {
			setChoices(null);
			completeSignIn(answer);
			return;
		}
		const challenge = twoFactorChallengeOf(answer);
		if (challenge) {
			twoFactor.open(challenge);
			return;
		}
		await reportFailure(answer, showError);
	};

	const chooseWorkspace = async (choice: WorkspaceChoice) => {
		setChoosing(choice.token);
		setWorkspaceError(undefined);
		await signInToWorkspace(choice, setWorkspaceError);
		setChoosing(null);
	};

	const backToPassword = () => {
		twoFactor.close();
		setChoices(null);
		setChoosing(null);
		setWorkspaceError(undefined);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		edits.current += 1;
		if (error) setError(undefined);
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);
		setError(undefined);
		const editsAtSubmit = edits.current;
		const showError = (message: string) => {
			if (edits.current === editsAtSubmit) {
				setError(message);
			}
		};

		try {
			// The workspaces the email and password open, as the web app's sign-in lists them: one signs in at once,
			// several wait for the person's pick (ever-co/ever-teams#5700).
			const { email, password } = formData;
			const listed = await authWithEmailPassword({ email, password, includeTeams: false }, api);
			const isList = 'workspaces' in listed;
			if (!isList) {
				await reportFailure(listed, showError);
				return;
			}
			const found = workspaceChoicesOf(listed);
			if (found.length === 0) {
				showError(t('ERROR.invalid_password_or_email'));
				return;
			}
			if (found.length === 1) {
				await signInToWorkspace(found[0], showError);
				return;
			}
			setChoices(found);
		} catch {
			// No answer: say whether this site is not allowed or Ever Teams is unreachable, inside the form.
			const kind = await kindOfFailedRequest(apiUrlOf(api));
			showError(t(SIGN_IN_ERROR_MESSAGE_KEYS[kind]));
		} finally {
			setLoading(false);
		}
	};

	const workspaceStepOf = (): WorkspaceStep | null => {
		if (!choices) {
			return null;
		}
		return { choices, choosing, error: workspaceError, choose: chooseWorkspace };
	};

	return {
		formData,
		loading,
		error,
		handleInputChange,
		handleSubmit,
		twoFactor: twoFactor.step,
		workspaces: workspaceStepOf(),
		backToPassword
	};
};

export type TPasswordLoginForm = ReturnType<typeof usePasswordLoginForm>;
