import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import React, { useId, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface BorderIconProps {
    selectedCorner?: number;
    isSelected?: boolean;
}

export const SolidBorderIcon = () => {
    return (
        <svg width="10" height="10" fill="none">
            <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M2.5 1.5a1 1 0 00-1 1v5c0 .6.4 1 1 1h5c.6 0 1-.4 1-1v-5c0-.6-.4-1-1-1h-5zm0-1.5A2.5 2.5 0 000 2.5v5C0 8.9 1.1 10 2.5 10h5C8.9 10 10 8.9 10 7.5v-5C10 1.1 8.9 0 7.5 0h-5z"
            ></path>
        </svg>
    );
};

export const DottedBorderIcon = ({ selectedCorner = 0, isSelected = false }: BorderIconProps) => {
    return (
        <svg className={cn('text-gray-800 dark:text-gray-200')} xmlns="http://www.w3.org/2000/svg" width="10" height="10">
            <path
                className={cn(selectedCorner === 0 && isSelected ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400')}
                d="M 2.5 0 C 1.119 0 0 1.119 0 2.5 L 0 4 L 1.5 4 L 1.5 2.5 C 1.5 1.948 1.948 1.5 2.5 1.5 L 4 1.5 L 4 0 Z"
                fill="currentcolor"
                opacity="1"
            ></path>
            <path
                className={cn(selectedCorner === 1 && isSelected ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400')}
                d="M 10 2.5 C 10 1.119 8.881 0 7.5 0 L 6 0 L 6 1.5 L 7.5 1.5 C 8.052 1.5 8.5 1.948 8.5 2.5 L 8.5 4 L 10 4 Z"
                fill="currentcolor"
                opacity="1"
            ></path>
            <path
                className={cn(selectedCorner === 2 && isSelected ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400')}
                d="M 7.5 10 C 8.881 10 10 8.881 10 7.5 L 10 6 L 8.5 6 L 8.5 7.5 C 8.5 8.052 8.052 8.5 7.5 8.5 L 6 8.5 L 6 10 Z"
                fill="currentcolor"
                opacity="1"
            ></path>
            <path
                className={cn(selectedCorner === 3 && isSelected ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400')}
                d="M 0 7.5 C 0 8.881 1.119 10 2.5 10 L 4 10 L 4 8.5 L 2.5 8.5 C 1.948 8.5 1.5 8.052 1.5 7.5 L 1.5 6 L 0 6 Z"
                fill="currentcolor"
                opacity="1"
            ></path>
        </svg>
    );
};

interface SpacingControlsProps {
    title: string;
    value: any;
    setValue: (value: any) => void;
}

export const SpacingControls = ({
    value, // value: {tl,bl,tr,br ,all,isMultiple}
    title,
    setValue
}: SpacingControlsProps) => {
    const [selectedCorner, setSelectedCorner] = useState<number | null>(null);

    const radiusTypeOptions = useMemo(
        () => [
            {
                icon: SolidBorderIcon,
                value: 'false'
            },
            {
                icon: DottedBorderIcon,
                value: 'true'
            }
        ],
        []
    );

    const { all, isMultiple, ...rest } = value;

    const radiusOptions = useMemo(
        () => [
            ...Object.keys(rest).map((key) => {
                return {
                    value: value[key],
                    label: key
                };
            })
        ],
        [rest, value]
    );

    const selectedValue = value?.isMultiple?.toString() as string;
    const layoutId = useId();

    return (
        <div className="flex justify-between">
            <div className="w-40">
                <div className="flex items-center gap-2.5">
                    <div className="w-max h-max relative">
                        <Input
                            disabled={value.isMultiple}
                            className="w-20 h-8 text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 focus:ring-primary/50 dark:focus:ring-primary-light/50"
                            placeholder={'00'}
                            value={value.all}
                            onChange={({ target }) => {
                                setValue({
                                    ...value,
                                    all: Number(target.value)
                                });
                            }}
                            type="number"
                        />
                    </div>
                    <Tabs
                        onValueChange={(e) => {
                            setValue({
                                ...value,
                                isMultiple: e === 'false' ? false : true
                            });
                        }}
                        className="flex-1"
                    >
                        <div className="h-8 w-18">
                            <TabsList defaultValue={selectedValue} className="flex h-8 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                {radiusTypeOptions.map((item: any, index: number) => (
                                    <TabsTrigger
                                        key={index}
                                        id="tab"
                                        value={item.value}
                                        className="relative flex items-center justify-center cursor-pointer h-6"
                                    >
                                        {selectedValue === item.value ? (
                                            <motion.div
                                                className="absolute inset-0 bg-white dark:bg-gray-700 text-black dark:text-white rounded-md mx-0.5"
                                                layoutId={layoutId}
                                            ></motion.div>
                                        ) : null}
                                        <span className="text-xs z-10">
                                            <item.icon
                                                selectedCorner={selectedCorner}
                                                isSelected={value.isMultiple}
                                                className={cn('text-secondary transition-all', {
                                                    'text-primary dark:text-primary-light': selectedValue === item.value && index === 0
                                                })}
                                            />
                                        </span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>
                    </Tabs>
                </div>

                <motion.div
                    initial={{
                        height: 0
                    }}
                    animate={{
                        height: !value.isMultiple ? 0 : 'auto'
                    }}
                    className="flex justify-between items-center mt-3 overflow-hidden"
                >
                    {radiusOptions.map((item, index) => (
                        <div key={index}>
                            <Input
                                onFocus={() => {
                                    setSelectedCorner(index);
                                }}
                                className={cn(
                                    'w-8 h-8 p-0 text-xs text-center text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                                    {
                                        'border-primary dark:border-primary-light ring-1 ring-primary/30 dark:ring-primary-light/30': selectedCorner === index
                                    }
                                )}
                                placeholder={item.label}
                                value={item.value}
                                onChange={({ target }) => {
                                    setValue({
                                        ...value,
                                        [item.label]: Number(target.value)
                                    });
                                }}
                                type="number"
                            />
                            <div className="text-xs mt-[10px] text-gray-600 dark:text-gray-300 text-center uppercase font-medium">{item.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};
