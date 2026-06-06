import React from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { InputDrag } from '../../drag-components/form/input';
import { CheckBoxComp } from '../../drag-components/form/checkbox';
import { SelectDropdownComp } from '../../drag-components/form/select-box';
import { TextareaDrag } from '../../drag-components/form/textarea';
import { ToggleDrag } from '../../drag-components/form/toggle';
import { Members } from '../../drag-components';
import { Button } from '../../drag-components/content/button';
import {
    InputDefaultProps, CheckboxDefaultProps, SelectDropdownDefaultProps, MemberVariantCardProps,
    ButtonDefaultProps, TextareaDefaultProps, ToggleDefaultProps
} from '../../drag-components';
import { MessageSquareText, TextCursorInput, Type, Check } from 'lucide-react';

export const uiComponents = [
    {
        label: "Member Card",
        id: "MemberCard",
        component: <Members {...MemberVariantCardProps} />,
        imageSrc: "/components/member-activities.png"
    },
    {
        label: "Button",
        id: "Button",
        component: <Button {...ButtonDefaultProps} />,
        customPreview: (
            <div className="flex items-center justify-center p-2">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                >
                    <rect width="14" height="8" x="5" y="8" rx="2" />
                </svg>
            </div>
        )
    },
    {
        label: "Text Input",
        id: "Input",
        component: <InputDrag {...InputDefaultProps} />,
        customPreview: (
            <div className="flex flex-col items-center justify-center w-full p-2">
                <TextCursorInput className="w-6 h-6 mb-2 text-primary" />
            </div>
        )
    },
    {
        label: "Textarea",
        id: "Textarea",
        component: <TextareaDrag {...TextareaDefaultProps} />,
        customPreview: (
            <div className="flex items-center justify-center p-2">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                >
                    <rect width="18" height="14" x="3" y="5" rx="2" />
                    <line x1="7" y1="9" x2="17" y2="9" />
                    <line x1="7" y1="13" x2="17" y2="13" />
                    <line x1="7" y1="17" x2="13" y2="17" />
                </svg>
            </div>
        )
    },
    {
        label: "Toggle",
        id: "Toggle",
        component: <ToggleDrag {...ToggleDefaultProps} />,
        customPreview: (
            <div className="flex items-center justify-center p-2">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                >
                    <rect x="4" y="8" width="16" height="8" rx="2" />
                    <circle cx="14" cy="12" r="2" />
                </svg>
            </div>
        )
    },
    {
        label: "Select Dropdown",
        id: "SelectDropdown",
        component: <SelectDropdownComp {...SelectDropdownDefaultProps} />,
        customPreview: (
            <div className="flex items-center justify-center w-full h-full">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                >
                    <path d="M8 9l4-4 4 4" />
                    <path d="M16 15l-4 4-4-4" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                </svg>
            </div>
        )
    },
    {
        label: "Checkbox",
        id: "Checkbox",
        component: <CheckBoxComp {...CheckboxDefaultProps} />,
        customPreview: (
            <div className="flex items-center justify-center p-2 gap-2">
                <div className="flex items-center justify-center w-5 h-5 rounded border-[1.5px] !border-gray-300 dark:!border-gray-600 bg-white dark:bg-gray-800 shadow-sm">
                    <Check className="w-3.5 h-3.5 text-primary dark:text-primary-light" />
                </div>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Checkbox option</span>
            </div>
        )
    }
];
