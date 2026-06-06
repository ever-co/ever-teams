import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useNode } from '@craftjs/core';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Plus, Trash } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Label } from '@/components/ui/label';
import { ConfigItem, EditorConfigProps } from '../../types/editor-config';
import { ImageUploader } from './inputs/image-uploader';
import { SpacingControls } from './inputs/spacing-controls';
import { OptionsEditor } from './inputs/options-editor';

export const PropertyEditor = ({ config, className = '' }: EditorConfigProps) => {
    const node = useNode((node) => node);

    const onChange = (property: string, value: any) => {
        return node.actions.setProp((props: any) => (props[property] = value), 1000);
    };

    const renderInput = (item: ConfigItem) => {
        switch (item.type) {
            case 'text':
            case 'number':
                return (
                    <div className={cn('flex relative justify-between items-center')}>
                        <Label htmlFor={item.property} className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</Label>
                        <Input
                            className="w-36 p-1 h-8 bg-[#1C1E29] border-[#2D303E] text-white"
                            type={item.type}
                            name={item.property}
                            min={item.type === 'number' ? item.options.min : undefined}
                            max={item.type === 'number' ? item.options.max : undefined}
                            onChange={({ target }) => onChange(item.property, target.value)}
                            value={node.data.props[item.property]}
                            placeholder={`${item.label}`}
                        />
                    </div>
                );

            case 'textarea':
                return (
                    <>
                        <Label htmlFor={item.property} className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</Label>
                        <Textarea
                            onChange={({ target }) => onChange(item.property, target.value)}
                            value={node.data.props[item.property]}
                            className="text-sm bg-[#1C1E29] border-[#2D303E] text-white"
                            placeholder={`Enter ${item.label}`}
                        />
                    </>
                );

            case 'divider':
                return <div className={cn('border-b border-[#2D303E]', className)}></div>;

            case 'fieldArray':
                return (
                    <OptionsEditor
                        value={node.data.props[item.property]}
                        onChange={(value) => onChange(item.property, value)}
                        label={item.label}
                    />
                );

            case 'toggle':
                return (
                    <div className={cn('flex relative justify-between items-center')}>
                        <Label htmlFor={item.property} className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</Label>
                        <ToggleGroup
                            onValueChange={(value) => {
                                if (value) {
                                    onChange(item.property, value);
                                }
                            }}
                            type="single"
                            className="w-fit"
                        >
                            {item.list.map((Option) => (
                                <ToggleGroupItem
                                    key={Option.value}
                                    value={Option.value}
                                    aria-label="Toggle bold"
                                    className={cn(
                                        node.data.props[item.property] == Option.value
                                            ? 'border bg-[#3B4EFB] text-white'
                                            : 'border border-[#2D303E] text-white',
                                        'rounded-md p-2'
                                    )}
                                >
                                    <Option.Icon className={cn('h-4 w-4')} />
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                );

            case 'select':
                return (
                    <div className={cn('flex relative justify-between items-center')}>
                        <Label htmlFor={item.property} className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</Label>
                        <div className="w-32">
                            <Select onValueChange={(e) => onChange(item.property, e)}>
                                <SelectTrigger className="p-0.5 h-8 text-xs bg-[#1C1E29] border-[#2D303E] text-white">
                                    {item.list.find((v) => v.value == node.data.props[item.property])?.label}
                                </SelectTrigger>
                                <SelectContent className="bg-[#1C1E29] border-[#2D303E] text-white">
                                    {item.list.map((option) => (
                                        <SelectItem
                                            className="text-xs text-white hover:bg-[#3B4EFB]/20"
                                            key={option.value}
                                            value={option.value.toString()}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 'slider':
                return (
                    <div className={cn('flex relative justify-between items-center')}>
                        <Label htmlFor={item.property} className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</Label>
                        <div className="w-32">
                            <Slider
                                value={[Number(node.data.props[item.property])]}
                                onValueChange={(value) => onChange(item.property, value)}
                                max={item.max || 100}
                                min={item.min || 0}
                                step={1}
                            />
                        </div>
                    </div>
                );

            case 'switch':
                return (
                    <div className={cn('flex relative justify-between items-center')}>
                        <Label htmlFor={item.property} className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</Label>
                        <div className="absolute right-0 -top-2">
                            <Switch
                                checked={node.data.props[item.property]}
                                onCheckedChange={(value) => onChange(item.property, value)}
                                className="data-[state=checked]:bg-[#3B4EFB]"
                            />
                        </div>
                    </div>
                );

            case 'image':
                return (
                    <>
                        <Label htmlFor={item.property} className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</Label>
                        <ImageUploader
                            value={node.data.props[item.property]!}
                            onChange={(value) => onChange(item.property, value)}
                            sizeLimit={item.sizeLimit}
                            validFormats={item.validFormats}
                        />
                    </>
                );

            case 'spacing':
                const onChangeValue = (value: any) => {
                    onChange(item.property, value);
                };
                return (
                    <div className={cn('flex relative justify-between items-center')}>
                        <Label htmlFor={item.property} className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</Label>
                        <SpacingControls
                            setValue={onChangeValue}
                            title="Margin"
                            value={node.data.props[item.property]}
                        />
                    </div>
                );

            case 'color':
                return (
                    <>
                        <div className={cn('flex relative justify-between items-center')}>
                            <Label htmlFor={item.property} className="text-gray-800 dark:text-gray-100 font-medium">{item.label}</Label>
                            <div className="flex absolute right-0 items-center border border-[#2D303E] p-0.5 rounded-md cursor-pointer w-20 bg-[#1C1E29]">
                                <div
                                    className="h-5 w-5 rounded-md border border-[#2D303E] right-0"
                                    style={{
                                        backgroundColor: node.data.props[item.property]
                                    }}
                                ></div>
                                <p className="text-xs text-white ml-1">{node.data.props[item.property]}</p>
                            </div>
                            <Input
                                name={item.property}
                                id={item.property}
                                className="w-36 opacity-0 p-1 h-8"
                                type="color"
                                onChange={({ target }) => onChange(item.property, target.value)}
                                value={node.data.props[item.property]}
                                placeholder={`${item.label}`}
                            />
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <span className={cn(`space-y-4 ${className}`)}>
            {config.map((item, index) => (
                <div key={index}>{renderInput(item)}</div>
            ))}
        </span>
    );
};
