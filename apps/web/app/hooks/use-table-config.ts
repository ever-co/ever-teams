'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { IActivityReportGroupByDate } from '@/app/interfaces/activity/IActivityReport';
import {
  SortableColumn,
  TableColumn,
  createNumericCompare,
  createDateCompare,
  getUniqueProjectCount,
  getUniqueApplicationCount,
  calculateTotalTime,
  calculateAveragePercentage
} from '@/app/utils/table-utils';

export type ProductivityTableConfig = {
  sortableColumns: Record<string, SortableColumn<IActivityReportGroupByDate, any>>;
  tableColumns: TableColumn[];
};

export const useProductivityTableConfig = (): ProductivityTableConfig => {
  const t = useTranslations();

  return useMemo(() => {
    const sortableColumns = {
      date: {
        getValue: (data: IActivityReportGroupByDate) => new Date(data.date).getTime(),
        compare: createDateCompare()
      },
      projects: {
        getValue: getUniqueProjectCount,
        compare: createNumericCompare()
      },
      application: {
        getValue: getUniqueApplicationCount,
        compare: createNumericCompare()
      },
      timeSpent: {
        getValue: calculateTotalTime,
        compare: createNumericCompare()
      },
      percentUsed: {
        getValue: calculateAveragePercentage,
        compare: createNumericCompare()
      }
    };

    const tableColumns = [
      {
        key: 'member',
        label: t('common.teamStats.MEMBER'),
        sortable: true
      },
      {
        key: 'projects',
        label: t('sidebar.PROJECTS'),
        sortable: true
      },
      {
        key: 'application',
        label: t('common.APPLICATION'),
        sortable: true
      },
      {
        key: 'timeSpent',
        label: t('common.TIME_SPENT'),
        sortable: true
      },
      {
        key: 'percentUsed',
        label: t('common.PERCENT_USED'),
        sortable: true
      }
    ];

    return {
      sortableColumns,
      tableColumns
    };
  }, [t]);
};
