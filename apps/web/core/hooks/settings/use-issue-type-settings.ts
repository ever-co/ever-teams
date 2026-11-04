'use client';

import { useCallback, useMemo, useState } from 'react';
import { useIssueTypesQuery } from '@/core/hooks/tasks/use-issue-types-query';
import { useCreateIssueType } from '@/core/hooks/tasks/use-create-issue-type';
import { useEditIssueType } from '@/core/hooks/tasks/use-edit-issue-type';
import { useDeleteIssueType } from '@/core/hooks/tasks/use-delete-issue-type';
import { EIssueType } from '@/core/types/generics/enums/task';
import { IIssueType } from '@/core/types/interfaces/task/issue-type';
import {
	PropertyListItem,
	PropertyLookBody,
	propertyItemsOf,
	TaskPropertySettingsModel
} from '@/core/lib/utils/settings-task-properties';
import { PropertyCreateBody, usePropertyActions } from './use-property-actions';

/** Gauzy types the name with its four built-in types, yet stores any text a team gives its own types. */
function issueTypeNameOf(name: string) {
	return name as EIssueType;
}

function isFormerDefault(issueType: IIssueType, pickedId: string) {
	const isOther = issueType.id !== pickedId;
	return isOther && Boolean(issueType.isDefault);
}

export interface IssueTypeSettingsModel extends TaskPropertySettingsModel {
	defaultItem: PropertyListItem | null;
	makeDefault: (item: PropertyListItem) => Promise<void>;
	isSavingDefault: boolean;
}

export function useIssueTypeSettings(): IssueTypeSettingsModel {
	const { issueTypes, loading, isError, refetch } = useIssueTypesQuery();
	const { createIssueType } = useCreateIssueType();
	const { editIssueType } = useEditIssueType();
	const { deleteIssueType } = useDeleteIssueType();
	const [isSavingDefault, setIsSavingDefault] = useState(false);

	const createType = useCallback(
		(body: PropertyCreateBody) => {
			const name = issueTypeNameOf(body.name);
			return createIssueType({ ...body, name });
		},
		[createIssueType]
	);
	const editType = useCallback(
		(id: string, body: PropertyLookBody) => {
			const name = issueTypeNameOf(body.name);
			return editIssueType(id, { ...body, name });
		},
		[editIssueType]
	);
	const { create, update, remove } = usePropertyActions({
		createProperty: createType,
		editProperty: editType,
		deleteProperty: deleteIssueType
	});

	const items = useMemo(() => propertyItemsOf(issueTypes), [issueTypes]);
	const defaultItem = items.find((item) => item.isDefault) ?? null;

	const makeDefault = useCallback(
		async (item: PropertyListItem) => {
			const picked = issueTypes.find((issueType) => issueType.id === item.id);
			if (!picked) {
				return;
			}
			const formerDefaults = issueTypes.filter((issueType) => isFormerDefault(issueType, picked.id));
			setIsSavingDefault(true);
			try {
				await editIssueType(picked.id, { ...picked, isDefault: true });
				const clearings = formerDefaults.map((issueType) =>
					editIssueType(issueType.id, { ...issueType, isDefault: false })
				);
				await Promise.all(clearings);
			} finally {
				setIsSavingDefault(false);
			}
		},
		[editIssueType, issueTypes]
	);

	return {
		items,
		isLoading: loading,
		isError,
		retry: refetch,
		create,
		update,
		remove,
		defaultItem,
		makeDefault,
		isSavingDefault
	};
}
