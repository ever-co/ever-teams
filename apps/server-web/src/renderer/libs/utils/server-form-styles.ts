/**
 * Shared Tailwind class strings for the server-settings form sections.
 * Used by both the Settings page (Server.tsx) and the setup wizard (AdvancedSetting.tsx).
 */
export const serverFormStyles = {
    input:
        'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-transparent transition-[border-color,box-shadow] duration-150',
    label: 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1',
    sectionHeading:
        'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3',
    sectionCard:
        'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-4 mb-3',
};
