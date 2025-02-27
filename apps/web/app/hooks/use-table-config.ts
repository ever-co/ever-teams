'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { IActivityReportGroupByDate, IActivityItem } from '@/app/interfaces/activity/IActivityReport';
import {
  SortableColumn,
  TableColumn,
  createDateCompare,
  createStringCompare,
  createNumericCompare,
  getUniqueProjectCount,
  getUniqueApplicationCount,
  calculateTotalTime,
  calculateAveragePercentage
} from '@/app/utils/table-utils';

export type TableConfig<T> = {
  sortableColumns: Record<string, SortableColumn<T, any>>;
  tableColumns: TableColumn[];
};

type TableConfigOptions<T> = {
  columnDefinitions: {
    key: string;
    label: string;
    sortable?: boolean;
    getValue?: (data: T) => any;
    compare?: (a: any, b: any) => number;
  }[];
};

export const useTableConfig = <T extends Record<string, any>>(
  options: TableConfigOptions<T>
): TableConfig<T> => {
  const t = useTranslations();

  return useMemo(() => {
    const sortableColumns: Record<string, SortableColumn<T, any>> = {};
    const tableColumns: TableColumn[] = [];

    options.columnDefinitions.forEach((column) => {
      tableColumns.push({
        key: column.key,
        label: t(column.label as any),
        sortable: column.sortable ?? false
      });

      if (column.sortable) {
        sortableColumns[column.key] = {
          getValue: column.getValue || ((data: T) => data[column.key]),
          compare: column.compare || createNumericCompare()
        };
      }
    });

    return {
      sortableColumns,
      tableColumns
    };
  }, [t, options]);
};

export const useProductivityTableConfig = (): TableConfig<IActivityReportGroupByDate> => {
  return useTableConfig<IActivityReportGroupByDate>({
    columnDefinitions: [
      {
        key: 'member',
        label: 'common.teamStats.MEMBER',
        sortable: true
      },
      {
        key: 'projects',
        label: 'sidebar.PROJECTS',
        sortable: true,
        getValue: getUniqueProjectCount,
        compare: createNumericCompare()
      },
      {
        key: 'application',
        label: 'common.APPLICATION',
        sortable: true,
        getValue: getUniqueApplicationCount,
        compare: createNumericCompare()
      },
      {
        key: 'timeSpent',
        label: 'common.TIME_SPENT',
        sortable: true,
        getValue: calculateTotalTime,
        compare: createNumericCompare()
      },
      {
        key: 'percentUsed',
        label: 'common.PERCENT_USED',
        sortable: true,
        getValue: calculateAveragePercentage,
        compare: createNumericCompare()
      }
    ]
  });
};


export const useProductivityEmployeeTableConfig = (): TableConfig<IActivityItem> => {
  return useTableConfig<IActivityItem>({
    columnDefinitions: [
      {
        key: 'date',
        label: 'common.DATE',
        sortable: true,
        getValue: (data) => data.date,
        compare: createDateCompare()
      },
      {
        key: 'project',
        label: 'sidebar.PROJECTS',
        sortable: true,
        getValue: (data) => data.project?.name || 'No project',
        compare: createStringCompare()
      },
      {
        key: 'activity',
        label: 'common.ACTIVITY',
        sortable: true,
        getValue: (data) => data.title || 'No activity',
        compare: createStringCompare()
      },
      {
        key: 'timeSpent',
        label: 'common.TIME_SPENT',
        sortable: true,
        getValue: (data) => data.duration.toString(),
        compare: createNumericCompare()
      },
      {
        key: 'percentUsed',
        label: 'common.PERCENT_USED',
        sortable: true,
        getValue: (data) => data.duration_percentage,
        compare: createNumericCompare()
      }
    ]
  });
};


export const useProductivityApplicationTableConfig = (): TableConfig<IActivityReportGroupByDate> => {
  return useTableConfig<IActivityReportGroupByDate>({
    columnDefinitions: [
      {
        key: 'date',
        label: 'common.DATE',
        sortable: true,
        getValue: (data) => data.date,
        compare: createDateCompare()
      },
      {
        key: 'project',
        label: 'sidebar.PROJECTS',
        sortable: true,
        getValue: (data) => {
          const project = data.employees?.[0]?.projects?.[0]?.project;
          return project?.name || 'No project';
        },
        compare: createStringCompare()
      },
      {
        key: 'member',
        label: 'common.MEMBER',
        sortable: true,
        getValue: (data) => {
          const employee = data.employees?.[0];
          return employee?.employee.fullName || 'Unknown';
        },
        compare: createStringCompare()
      },
      {
        key: 'timeSpent',
        label: 'common.TIME_SPENT',
        sortable: true,
        getValue: (data) => {
          return data.employees?.reduce((total, emp) =>
            total + emp.projects.reduce((pTotal, proj) =>
              pTotal + proj.activity.reduce((aTotal, act) => aTotal + act.duration, 0)
            , 0)
          , 0) || 0;
        },
        compare: createNumericCompare()
      },
      {
        key: 'percentUsed',
        label: 'common.PERCENT_USED',
        sortable: true,
        getValue: (data) => {
          const activities = data.employees?.flatMap(emp =>
            emp.projects.flatMap(proj => proj.activity)
          ) || [];
          const totalPercentage = activities.reduce((sum, act) =>
            sum + parseFloat(act.duration_percentage), 0
          );
          return activities.length ? totalPercentage / activities.length : 0;
        },
        compare: createNumericCompare()
      }
    ]
  });
};

export const useProductivityProjectTableConfig = (): TableConfig<IActivityItem> => {
  return useTableConfig<IActivityItem>({
    columnDefinitions: [
      {
        key: 'date',
        label: 'common.DATE',
        sortable: true,
        getValue: (data) => data.date,
        compare: createDateCompare()
      },
      {
        key: 'member',
        label: 'common.MEMBER',
        sortable: true,
        getValue: (data) => data.employee?.fullName || 'Unknown',
        compare: createStringCompare()
      },
      {
        key: 'application',
        label: 'common.APPLICATION',
        sortable: true,
        getValue: (data) => data.title || 'No activity',
        compare: createStringCompare()
      },
      {
        key: 'timeSpent',
        label: 'common.TIME_SPENT',
        sortable: true,
        getValue: (data) => data.duration.toString(),
        compare: createNumericCompare()
      },
      {
        key: 'percentUsed',
        label: 'common.PERCENT_USED',
        sortable: true,
        getValue: (data) => data.duration_percentage,
        compare: createNumericCompare()
      }
    ]
  });
};
