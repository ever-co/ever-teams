import { Button } from '@/components/ui/button';
import { useEditor } from '@craftjs/core';
import React from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExport } from '../hooks/use-export';

const ExportButton = () => {
    const { enabled } = useEditor((state) => ({
        enabled: state.options.enabled
    }));

    const { handleExportNextJS } = useExport();

    return (
        <div>
            <Button
                type='button'
                className={cn([
                    'transition dark:bg-indigo-800 dark:text-slate-100 hover:dark:bg-indigo-800 cursor-pointer rounded-md text-white hover:bg-indigo-800 gap-2 ml-2',
                    {
                        'bg-indigo-800': enabled,
                        'bg-primary': !enabled,
                    }
                ])}
                onClick={() => handleExportNextJS({ projectName: 'my-craft-project' })}
            >
                <Download className="h-4 w-4" />
                Export
            </Button>
        </div>
    );
};

export default ExportButton;
