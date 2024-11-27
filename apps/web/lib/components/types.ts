export type IVariant = 'primary' | 'outline' | 'ghost' | 'light' | 'dark';
type StatusColorScheme = {
    bg: string;
    border: string,
    text: string;
    bgOpacity: string;
};

const STATUS_COLORS: Record<string, StatusColorScheme> = {
    PENDING: {
        bg: 'bg-[#FBB650]',
        border: 'rgb(251, 182, 80)',
        text: 'text-[#FBB650]',
        bgOpacity: 'rgba(251, 182, 80, 0.1)',
    },
    APPROVED: {
        bg: 'bg-[#30B366]',
        border: 'rgba(48, 179, 102)',
        text: 'text-[#30B366]',
        bgOpacity: 'rgba(48, 179, 102, 0.1)',
    },
    DENIED: {
        bg: 'bg-[#dc2626]',
        border: 'rgba(220, 38, 38)',
        text: 'text-[#dc2626]',
        bgOpacity: 'rgba(220, 38, 38, 0.1)',
    },
    DRAFT: {
        bg: 'bg-gray-300',
        border: 'rgba(220, 220, 220)',
        text: 'text-gray-500',
        bgOpacity: 'rgba(220, 220, 220, 0.1)',
    },
    'IN REVIEW': {
        bg: 'bg-blue-500',
        border: 'rgba(59, 130, 246)',
        text: 'text-blue-500',
        bgOpacity: 'rgba(59, 130, 246, 0.1)',
    },
    DEFAULT: {
        bg: 'bg-gray-100',
        border: 'rgba(243, 244, 246)',
        text: 'text-gray-400',
        bgOpacity: 'rgba(243, 244, 246, 0.1)',
    },

};


/**
* Returns color scheme for a given status
* @param status - The status string to get colors for
* @returns StatusColorScheme object or empty object if status not found
*/
export const statusColor = (status: string): Partial<StatusColorScheme> => {
    return STATUS_COLORS[status] || {};
};
