import { motion } from 'framer-motion';
import { BuilderCardContent } from './builder-card-content';
import { Builder } from '../../../types';

export const BuilderCard = ({ builder }: { builder: Builder }) => (
    <motion.a
        key={builder.name}
        href={builder.href}
        className="group relative p-6 bg-white dark:bg-[#080808] rounded-2xl backdrop-blur-sm border border-gray-200 dark:border-white/5 hover:border-blue-500 dark:hover:border-[#3826A6] transition-all duration-300 flex flex-col min-h-[300px] overflow-hidden"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
    >
        <BuilderCardContent builder={builder} />
    </motion.a>
);
