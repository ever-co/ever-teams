import Image from 'next/image';
import { Builder } from '../../../types';

export const BuilderHeader = ({ builder }: { builder: Builder }) => (
    <div className="flex items-center gap-2 mb-4">
        <Image
            src={builder.icon}
            alt={builder.name}
            width={20}
            height={20}
        />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">{builder.name}</h2>
    </div>
);