import React from 'react';

interface ProductivityHeaderProps {
    month: string;
    year: number;
}

export const ProductivityHeader: React.FC<ProductivityHeaderProps> = ({ month, year }) => {
    return (
        <div className="flex flex-col">
            <h2 className="text-xl font-bold">{`${month} ${year}`}</h2>
            <p className="text-gray-500">{`Productivity breakdown for ${month}`}</p>
        </div>
    );
};
