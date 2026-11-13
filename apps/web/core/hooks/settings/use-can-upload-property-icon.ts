'use client';

import { useMemo } from 'react';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';

/**
 * The role permissions Gauzy's image upload asks for, any one of them (`ImageAssetController` in
 * `packages/core/src/lib/image-asset`). The default manager role edits task settings without either.
 */
const IMAGE_UPLOAD_PERMISSIONS: readonly string[] = Object.freeze(['ALL_ORG_EDIT', 'MEDIA_GALLERY_ADD']);

/**
 * Whether the user may upload an image as an icon, so the picker offers the upload only to them. Until the
 * permissions load, no: the upload may appear late, never early.
 */
export function useCanUploadPropertyIcon(): boolean {
	const { myPermissions } = useMyRolePermissionsQuery();
	return useMemo(
		() => IMAGE_UPLOAD_PERMISSIONS.some((permission) => myPermissions.includes(permission)),
		[myPermissions]
	);
}
