import React from 'react';
import { Element } from '@craftjs/core';
import { ResizableContainer } from '../../resizable-container';
import FlexLayout from '../../drag-components/layout/flex-layout';
import GridLayout from '../../drag-components/layout/grid-layout';
import { RowLayout as RowComponent, ColumnProps, ColumnSize, ROW_PRESETS } from '../../drag-components/layout/row-layout/index';
import { FlexLayoutDefaultProps, GridDefaultProps } from '../../drag-components';
import { Layout } from 'lucide-react';

export const layoutComponents = [
    {
        label: "Row Layout",
        id: "RowLayout",
        component: (
            <Element
                canvas
                is={RowComponent}
                custom={{ displayName: 'Row Layout' }}
                columns={ROW_PRESETS['Thirds'] as ColumnProps[]}
                gap="16px"
                alignment="stretch"
                padding={16}
                backgroundColor=""
                borderRadius={4}
                border={false}
            />
        ),
        customPreview: (
            <div className="flex flex-col items-center justify-center w-full p-2">
                {/* <Layout className="w-6 h-6 mb-2 text-primary dark:text-primary-light" /> */}
                <div className="w-full flex gap-2">
                    <div className="flex-1 h-10 border-[1.5px] !border-gray-300 dark:!border-gray-600 rounded-md bg-white/50 dark:bg-gray-800/50 flex items-center justify-center">
                        <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="flex-1 h-10 border-[1.5px] !border-gray-300 dark:!border-gray-600 rounded-md bg-white/50 dark:bg-gray-800/50 flex items-center justify-center">
                        <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="flex-1 h-10 border-[1.5px] !border-gray-300 dark:!border-gray-600 rounded-md bg-white/50 dark:bg-gray-800/50 flex items-center justify-center">
                        <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </div>
            </div>
        ),
        icon: <Layout className="w-4 h-4" />
    },
    {
        label: "Column Layout",
        id: "ColumnLayout",
        component: <FlexLayout {...FlexLayoutDefaultProps} />,
        customPreview: (
            <div className="flex flex-col items-center justify-center w-full p-2">
                <div className="w-full flex flex-col gap-2 p-3 !bg-gray-50/50 dark:!bg-gray-800/50 !border-2 !border-gray-200 dark:!border-gray-700 rounded-md">
                    <div className="h-8 !bg-white dark:!bg-gray-900 !border-2 !border-dashed !border-gray-300 dark:!border-gray-600 rounded-md flex items-center justify-center">
                        <div className="h-3 w-4/5 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    </div>
                    <div className="h-8 !bg-white dark:!bg-gray-900 !border-2 !border-dashed !border-gray-300 dark:!border-gray-600 rounded-md flex items-center justify-center">
                        <div className="h-3 w-4/5 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    </div>
                    <div className="h-8 !bg-white dark:!bg-gray-900 !border-2 !border-dashed !border-gray-300 dark:!border-gray-600 rounded-md flex items-center justify-center">
                        <div className="h-3 w-4/5 bg-gray-100 dark:bg-gray-800 rounded"></div>
                    </div>
                </div>
            </div>
        ),
        icon: <Layout className="w-4 h-4" />
    },
    {
        label: "Grid Layout",
        id: "GridLayout",
        component: <GridLayout {...GridDefaultProps} />,
        customPreview: (
            <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full p-2">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-7 w-full border-[1.5px] !border-gray-300 dark:!border-gray-600 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                    >
                        <div className="w-2/3 h-2 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                ))}
            </div>
        )
    }
];
