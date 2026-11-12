'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { WorkspaceWelcomePage } from '@/core/components/pages/workspace/workspace-welcome-page';

export default withAuthentication(WorkspaceWelcomePage, { displayName: 'WorkspaceWelcome' });
