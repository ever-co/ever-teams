'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { CreateWorkspacePage } from '@/core/components/pages/workspace/create-workspace-page';

export default withAuthentication(CreateWorkspacePage, { displayName: 'CreateWorkspace' });
