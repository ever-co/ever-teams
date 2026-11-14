'use client';

import { useCallback } from 'react';
import { useAtomValue, useStore } from 'jotai';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { getAccessTokenCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { downloadBlob } from '@/core/lib/utils/dashboard-export';
import {
	canExportWorkspaceData,
	isCompleteZipArchive,
	workspaceExportFileName
} from '@/core/lib/utils/workspace-data-export';
import { workspaceExportService } from '@/core/services/client/api/export/workspace-export.service';
import { workspaceDataExportState } from '@/core/stores/settings/workspace-data-export';

/** The bytes that tell a whole ZIP archive: its signature, then its end record and the longest comment after it. */
const ARCHIVE_SIGNATURE_BYTES = 4;
const ARCHIVE_END_BYTES = 22 + 0xffff;

/**
 * The start and the end of `archive`, which are what `isCompleteZipArchive` reads, without copying a large archive
 * whole into memory a second time.
 */
async function archiveEndsOf(archive: Blob): Promise<Uint8Array> {
	const isSmall = archive.size <= ARCHIVE_SIGNATURE_BYTES + ARCHIVE_END_BYTES;
	if (isSmall) {
		return new Uint8Array(await archive.arrayBuffer());
	}
	const start = new Uint8Array(await archive.slice(0, ARCHIVE_SIGNATURE_BYTES).arrayBuffer());
	const end = new Uint8Array(await archive.slice(archive.size - ARCHIVE_END_BYTES).arrayBuffer());
	const ends = new Uint8Array(start.length + end.length);
	ends.set(start, 0);
	ends.set(end, start.length);
	return ends;
}

interface WorkspaceDataExportOptions {
	workspaceName: string;
	organizationId: string | undefined;
}

/**
 * The export of all of the workspace's data: who gets it, and the export itself. The archive is saved only once it
 * arrived whole; a failed or cut answer turns into a failure the page shows with a new try, never into a broken file.
 * Its state lives in the tab's store, so one export runs at a time even when the page is left and opened again.
 */
export function useWorkspaceDataExport({ workspaceName, organizationId }: WorkspaceDataExportOptions) {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const { myPermissions } = useMyRolePermissionsQuery();
	const store = useStore();
	const state = useAtomValue(workspaceDataExportState, { store });

	const exportAll = useCallback(async () => {
		const isReady = Boolean(organizationId);
		const isRunning = store.get(workspaceDataExportState) === 'exporting';
		if (isRunning || !isReady) {
			return;
		}
		store.set(workspaceDataExportState, 'exporting');
		try {
			const scope = {
				tenantId: getTenantIdCookie(),
				accessToken: getAccessTokenCookie(),
				organizationId: organizationId as string
			};
			const archive = await workspaceExportService.downloadWorkspaceArchive(scope);
			const ends = await archiveEndsOf(archive);
			if (!isCompleteZipArchive(ends)) {
				throw new Error('The archive did not arrive whole');
			}
			const fileName = workspaceExportFileName(workspaceName, new Date());
			downloadBlob(archive, fileName);
			toast.success(t('settings.workspace.EXPORT_DONE'), { description: fileName });
			store.set(workspaceDataExportState, 'idle');
		} catch {
			store.set(workspaceDataExportState, 'failed');
		}
	}, [organizationId, store, t, workspaceName]);

	return {
		canExport: canExportWorkspaceData(user?.role?.name, myPermissions),
		isExporting: state === 'exporting',
		isFailed: state === 'failed',
		exportAll
	};
}
