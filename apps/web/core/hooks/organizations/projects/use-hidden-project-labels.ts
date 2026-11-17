'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { HiddenProjectLabels } from '@/core/lib/utils/project-visibility';

/**
 * How a project the API keeps from the caller is named (CORE-27): "Private project" for one record's project, and
 * "Private projects" for the row or the filter choice all of them share.
 */
export function useHiddenProjectLabels(): HiddenProjectLabels {
	const t = useTranslations();
	const one = t('common.PRIVATE_PROJECT');
	const many = t('common.PRIVATE_PROJECTS');
	return useMemo(() => ({ one, many }), [one, many]);
}
