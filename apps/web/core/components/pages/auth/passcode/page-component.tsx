'use client';

import { WorkspacePicker, type WorkspacePickerProps } from '@/core/components/auth/workspace-picker';
import { SignInPage } from '../sign-in/sign-in-page';

function AuthPasscode() {
	return <SignInPage defaultMethod="code" />;
}

/**
 * The workspace pick, kept under its former name: the social and Ever ID sign-in imports it from here.
 */
export function WorkSpaceComponent(props: Readonly<WorkspacePickerProps>) {
	return <WorkspacePicker {...props} />;
}

export default AuthPasscode;
