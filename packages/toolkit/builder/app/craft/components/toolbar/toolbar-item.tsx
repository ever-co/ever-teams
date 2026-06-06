import { useNode } from '@craftjs/core';
import React from 'react';
import { ToolbarDropdown } from './toolbar-dropdown';
import { ToolbarTextInput } from './toolbar-text-input';
import { Input } from '@/components/ui/input';
import { ToolbarItemProps } from '../../types';
import { Label } from '@/components/ui/label';

export const ToolbarItem: React.FC<ToolbarItemProps> = ({
  full = false,
  propKey,
  type,
  onChange,
  index,
  label,
  ...props
}) => {
  const {
    actions: { setProp },
    propValue,
  } = useNode((node) => ({
    propValue: node.data.props[propKey],
  }));

  // Clean the value for display (remove any px suffix)
  const cleanValue = (val: any) => {
    if (typeof val === 'string' && val.endsWith('px')) {
      return val.replace('px', '');
    }
    return val;
  };

  const value = Array.isArray(propValue) && index !== undefined
    ? cleanValue(propValue[index])
    : cleanValue(propValue);

  const handleValueChange = (newValue: any) => {
    // For slider inputs, ensure we're storing numeric values
    if (type === 'slider') {
      // Convert to number and handle NaN
      let processedValue;

      if (typeof newValue === 'string') {
        // Remove any non-numeric characters
        processedValue = parseInt(newValue.replace(/[^0-9-]/g, ''));
      } else {
        processedValue = Number(newValue);
      }

      if (isNaN(processedValue)) {
        processedValue = 0;
      }

      setProp((props: Record<string, any>) => {
        if (Array.isArray(propValue) && index !== undefined) {
          props[propKey][index] = processedValue;
        } else {
          props[propKey] = processedValue;
        }
      }, 500);
    } else {
      // For other input types
      const processedValue = onChange ? onChange(newValue) : newValue;

      setProp((props: Record<string, any>) => {
        if (Array.isArray(propValue) && index !== undefined) {
          props[propKey][index] = processedValue;
        } else {
          props[propKey] = processedValue;
        }
      }, 500);
    }
  };

  return (
    <div className={full ? "mb-3 w-full" : "mb-2 w-full"}>
      {['text', 'color', 'bg', 'number'].includes(type) ? (
        <ToolbarTextInput
          {...props}
          type={type as 'text' | 'color' | 'bg' | 'number'}
          value={value}
          onChange={handleValueChange}
          label={label}
        />
      ) : type === 'select' ? (
        <ToolbarDropdown
          value={value || ''}
          onChange={handleValueChange}
          {...props as any}
        />
      ) : type === 'slider' ? (
        <div className="flex flex-col">
          <Label className="text-xs mb-1">{label}</Label>
          <div className="relative w-full">
            <Input
              type="number"
              className="h-7 w-full text-xs pr-6"
              value={value || 0}
              onChange={(e) => handleValueChange(e.target.value)}
              min={0}
              max={100}
            />
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">px</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
