export type IVariant = 'primary' | 'outline' | 'ghost' | 'light' | 'dark';
type StatusColorScheme = {
    bg: string;
    text: string;
    bgOpacity: string;
};

const STATUS_COLORS: Record<string, StatusColorScheme> = {
    Pending: {
        bg: 'bg-[#FBB650]',
        text: 'text-[#FBB650]',
        bgOpacity: 'rgba(251, 182, 80, 0.1)'
    },
    Approved: {
        bg: 'bg-[#30B366]',
        text: 'text-[#30B366]',
        bgOpacity: 'rgba(48, 179, 102, 0.1)'
    },
    Rejected: {
        bg: 'bg-[#dc2626]',
        text: 'text-[#dc2626]',
        bgOpacity: 'rgba(220, 38, 38, 0.1)'
    }
};


/**
* Returns color scheme for a given status
* @param status - The status string to get colors for
* @returns StatusColorScheme object or empty object if status not found
*/
export const statusColor = (status: string): Partial<StatusColorScheme> => {
    return STATUS_COLORS[status] || {};
};
