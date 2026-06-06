import { SortField, SortDirection } from './blocks-list';
import { TableHead, TableHeader, TableRow } from '@ever-teams/toolkit-ui';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface BlocksListHeaderProps {
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
}

export const BlocksListHeader = ({ sortField, sortDirection, onSort }: BlocksListHeaderProps) => {
    const renderSortIcon = (field: SortField) => {
        if (field !== sortField) {
            return <ArrowUpDown className="h-4 w-4 ml-2 text-slate-400" />;
        }
        return sortDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4 ml-2 text-blue-500" />
        ) : (
            <ArrowDown className="h-4 w-4 ml-2 text-blue-500" />
        );
    };

    return (
        <TableHeader>
            <TableRow className="border-b border-slate-200 dark:border-slate-800">
                <TableHead
                    className="sticky top-0 z-10 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 px-6 py-4 text-left cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => onSort('title')}
                >
                    <div className="flex items-center">
                        Title {renderSortIcon('title')}
                    </div>
                </TableHead>
                <TableHead
                    className="sticky top-0 z-10 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 px-6 py-4 text-left cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => onSort('builderPlatform')}
                >
                    <div className="flex items-center">
                        Builder Platform {renderSortIcon('builderPlatform')}
                    </div>
                </TableHead>
                <TableHead
                    className="sticky top-0 z-10 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 px-6 py-4 text-left cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => onSort('createdAt')}
                >
                    <div className="flex items-center">
                        Created {renderSortIcon('createdAt')}
                    </div>
                </TableHead>
                <TableHead
                    className="sticky top-0 z-10 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 px-6 py-4 text-left cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    onClick={() => onSort('updatedAt')}
                >
                    <div className="flex items-center">
                        Last Modified {renderSortIcon('updatedAt')}
                    </div>
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200 px-6 py-4 text-left">Actions</TableHead>
            </TableRow>
        </TableHeader>
    );
};
