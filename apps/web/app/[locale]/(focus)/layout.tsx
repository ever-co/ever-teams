import { FocusShell } from '@/core/components/layouts/focus/focus-shell';

/** Pages the user goes through outside the workspace: no sidebar, no app data, one card. */
export default function FocusGroupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	return <FocusShell>{children}</FocusShell>;
}
