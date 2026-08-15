import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@ever-teams/toolkit-ui';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  title: string;
  url?: string;
  isExternal?: boolean;
  hasSublinks?: boolean;
  isSelected?: boolean;
  onMouseEnter?: () => void;
}

export default function NavLink({ 
  title, 
  url, 
  isExternal,
  hasSublinks,
  isSelected,
  onMouseEnter
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === url || pathname.includes(url || '');

  const baseClasses = cn(
    "flex items-center gap-1 cursor-pointer bg-transparent",
    "font-normal text-sm rounded-[32px] py-2 px-3",
    "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
    "transition-colors relative z-[2]",
    (isSelected || isActive) && "font-bold text-gray-900 dark:text-white"
  );

  if (hasSublinks) {
    return (
      <motion.div
        className="group"
        onMouseEnter={onMouseEnter}
      >
        <span className={baseClasses}>
          {title}
          <ChevronDown className="mt-[0.6px] group-hover:rotate-180 transition-transform duration-200" />
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div onMouseEnter={onMouseEnter}>
      <Link
        href={url || '#'}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noopener noreferrer' : undefined}
        className={baseClasses}
      >
        {title}
      </Link>
    </motion.div>
  );
}
