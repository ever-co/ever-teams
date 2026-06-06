import React, { useState, useEffect } from 'react';

interface CheckboxProps {
    label: string;
    labelPosition: 'left' | 'right';
    defaultChecked: boolean;
    checkedColor: string;
    uncheckedColor: string;
    labelColor: string;
    size: number;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    className?: string;
    onChange?: (checked: boolean) => void;
}

export const Checkbox = ({
    label = 'Checkbox Label',
    labelPosition = 'right',
    defaultChecked = false,
    checkedColor = '#2D5BFF',
    uncheckedColor = '#FFFFFF',
    labelColor = '#1F2937',
    size = 20,
    borderRadius = 4,
    borderWidth = 2,
    borderColor = '#6B7280',
    className = '',
    onChange,
}: CheckboxProps) => {
    const [isChecked, setIsChecked] = useState(defaultChecked);

    useEffect(() => {
        setIsChecked(defaultChecked);
    }, [defaultChecked]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newChecked = event.target.checked;
        setIsChecked(newChecked);
        onChange?.(newChecked);
    };

    const checkboxStyle: React.CSSProperties = {
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        border: `${borderWidth}px solid ${borderColor}`,
        backgroundColor: isChecked ? checkedColor : uncheckedColor,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        appearance: 'none',
        margin: 0,
    };

    const labelStyle: React.CSSProperties = {
        color: labelColor,
        marginLeft: labelPosition === 'right' ? '8px' : 0,
        marginRight: labelPosition === 'left' ? '8px' : 0,
        cursor: 'pointer',
        fontSize: `${Math.max(14, size * 0.7)}px`,
    };

    const checkmarkStyle: React.CSSProperties = {
        opacity: isChecked ? 1 : 0,
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${size * 0.6}px`,
        height: `${size * 0.6}px`,
        transition: 'opacity 0.2s ease-in-out',
    };

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        flexDirection: labelPosition === 'left' ? 'row-reverse' : 'row',
    };

    return (
        <label style={containerStyle} className={className}>
            <input
                type="checkbox"
                checked={isChecked}
                onChange={handleChange}
                style={checkboxStyle}
            />
            {isChecked && (
                <svg
                    style={checkmarkStyle}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            )}
            <span style={labelStyle}>{label}</span>
        </label>
    );
};
