import React from 'react';

interface ProductivityData {
    date: string;
    productive: number;
    neutral: number;
    unproductive: number;
}

interface ProductivityChartProps {
    data: ProductivityData[];
}

export const ProductivityChart: React.FC<ProductivityChartProps> = ({ data }) => {
    return (
        <div className="flex gap-[2px] h-[220px] w-full justify-between">
            {data.map((day) => (
                <div
                    key={day.date}
                    className="flex relative flex-col flex-1 justify-end cursor-pointer group"
                >
                    <div className="flex overflow-hidden absolute inset-0 flex-col justify-end">
                        <div
                            style={{ height: `${day.productive}%` }}
                            className="w-full bg-[#1554E0] rounded-t-lg group-hover:opacity-80 transition-opacity duration-200"
                        ></div>
                        <div
                            style={{ height: `${day.unproductive}%` }}
                            className="w-full bg-[#F56D58] group-hover:opacity-80 transition-opacity duration-200"
                        ></div>
                        <div
                            style={{ height: `${day.neutral}%` }}
                            className="w-full bg-[#F5B458] group-hover:opacity-80 transition-opacity duration-200"
                        ></div>
                    </div>
                </div>
            ))}
        </div>
    );
};
