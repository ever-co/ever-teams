import { IActivityReportGroupByDate } from '@/app/interfaces/activity/IActivityReport';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface SortableColumn<T, V> {
  getValue: (data: T) => V;
  compare: (a: V, b: V) => number;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Generic comparison functions
export const createNumericCompare = () => (a: number | string, b: number | string): number => {
  // Handle null/undefined values
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  // Convert to numbers, handling edge cases
  const numA = typeof a === 'string' ? parseFloat(a.replace(/[^\d.-]/g, '')) || 0 : a;
  const numB = typeof b === 'string' ? parseFloat(b.replace(/[^\d.-]/g, '')) || 0 : b;

  // Handle NaN values
  if (isNaN(numA) && isNaN(numB)) return 0;
  if (isNaN(numA)) return -1;
  if (isNaN(numB)) return 1;

  return numA - numB;
};

export const createStringCompare = () => (a: string | number | null | undefined, b: string | number | null | undefined): number => {
  // Handle null/undefined values
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  // Convert to strings and normalize
  const strA = String(a).toLowerCase().trim();
  const strB = String(b).toLowerCase().trim();

  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
};

export const createDateCompare = () => (a: number | string | null | undefined, b: number | string | null | undefined): number => {
  // Handle null/undefined values
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  // Convert to timestamps
  const dateA = typeof a === 'string' ? new Date(a).getTime() : a;
  const dateB = typeof b === 'string' ? new Date(b).getTime() : b;

  // Handle invalid dates
  if (isNaN(dateA) && isNaN(dateB)) return 0;
  if (isNaN(dateA)) return -1;
  if (isNaN(dateB)) return 1;

  return dateA - dateB;
};

// Generic data extraction functions
export const extractValue = <T, K extends keyof T>(data: T, key: K): T[K] => data[key];

export const safeNumber = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseInt(value, 10) || 0;
  return 0;
};

// Activity specific utilities
export const calculateTotalTime = (data: IActivityReportGroupByDate): number => {
  let total = 0;
  data.employees?.forEach(employee => {
    employee.projects?.forEach(project => {
      project.activity?.forEach(activity => {
        total += safeNumber(activity.duration);
      });
    });
  });
  return total;
};

export const getUniqueProjectCount = (data: IActivityReportGroupByDate): number => {
  const uniqueProjects = new Set();
  data.employees?.forEach(employee => {
    employee.projects?.forEach(project => {
      uniqueProjects.add(project.project?.id || project.activity?.[0]?.projectId || 'unknown');
    });
  });
  return uniqueProjects.size;
};

export const getUniqueApplicationCount = (data: IActivityReportGroupByDate): number => {
  const uniqueApps = new Set();
  data.employees?.forEach(employee => {
    employee.projects?.forEach(project => {
      project.activity?.forEach(activity => {
        if (activity.title) {
          uniqueApps.add(activity.title);
        }
      });
    });
  });
  return uniqueApps.size;
};

export const calculateAveragePercentage = (data: IActivityReportGroupByDate): number => {
  let totalPercentage = 0;
  let count = 0;

  data.employees?.forEach(employee => {
    employee.projects?.forEach(project => {
      project.activity?.forEach(activity => {
        if (activity.duration_percentage) {
          totalPercentage += safeNumber(activity.duration_percentage);
          count++;
        }
      });
    });
  });

  return count > 0 ? totalPercentage / count : 0;
};

// Generic aggregation utilities
export const aggregateNumericValues = <T>(
  data: T[],
  getValue: (item: T) => number
): number => {
  return data.reduce((sum, item) => sum + getValue(item), 0);
};

export const countUniqueValues = <T>(
  data: T[],
  getValue: (item: T) => string | number
): number => {
  return new Set(data.map(getValue)).size;
};

// Type-safe data access
export const getNestedValue = <T>(
  obj: T,
  path: string[]
): any => {
  return path.reduce((current: any, key) => {
    return current?.[key];
  }, obj);
};

// Safe array operations
export const safeArrayForEach = <T>(
  arr: T[] | undefined | null,
  callback: (item: T) => void
): void => {
  if (Array.isArray(arr)) {
    arr.forEach(callback);
  }
};
