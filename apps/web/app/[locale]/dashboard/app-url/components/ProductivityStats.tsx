import React from 'react';

interface ProductivityStatsProps {
    productivePercentage: number;
    neutralPercentage: number;
    unproductivePercentage: number;
}

export const ProductivityStats: React.FC<ProductivityStatsProps> = ({
    productivePercentage,
    neutralPercentage,
    unproductivePercentage
}) => {
    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-start justify-center border-l border-l-gray-100 dark:border-l-gray-700 gap-2 h-[105px] w-[176px] px-4">
                <span>{productivePercentage}% Productive</span>
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
            </div>
            <div className="flex flex-col items-start justify-center border-l border-l-gray-100 dark:border-l-gray-700 gap-2 h-[105px] w-[176px] px-4">
                <span>{neutralPercentage}% Neutral</span>
                <div className="w-3 h-3 bg-yellow-400 rounded"></div>
            </div>
            <div className="flex flex-col items-start justify-center border-l border-l-gray-100 dark:border-l-gray-700 gap-2 h-[105px] w-[176px] px-4">
                <span>{unproductivePercentage}% Unproductive</span>
                <div className="w-3 h-3 bg-red-500 rounded"></div>
            </div>
        </div>
    );
};
