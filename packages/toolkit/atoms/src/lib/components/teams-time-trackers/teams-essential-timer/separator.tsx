import { ReactElement } from 'react';
import { Minus } from 'lucide-react';

interface SeparatorProps {
    separator: string;
}

export const Separator = ({ separator }: SeparatorProps): ReactElement => (
    <span className="inline-flex items-center justify-center h-full">
        {separator === 'default' ? (
            <div className="flex items-center h-full">
                <Minus className="rotate-90 stroke-gray-400" size={16} />
            </div>
        ) : (
            <span className="flex items-center h-full stroke-gray-400">{separator}</span>
        )}
    </span>
);