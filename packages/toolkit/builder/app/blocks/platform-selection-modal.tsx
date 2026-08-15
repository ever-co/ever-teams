'use client';

import { useState } from 'react';
import { BuilderPlatform } from './storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface PlatformSelectionModalProps {
    isOpen: boolean;
    onCancelAction: () => void;
    onConfirmAction: (params: {
        platform: BuilderPlatform;
        title: string;
        url?: string;
        plasmicProjectId?: string;
    }) => Promise<void>;
}

const platforms: { label: string; value: BuilderPlatform; image: string }[] = [
    { label: 'Builder.io', value: BuilderPlatform.BuilderIO, image: '/builder.io.png' },
    { label: 'Craft.js', value: BuilderPlatform.CraftJS, image: '/craft.js.svg' },
    { label: 'Plasmic', value: BuilderPlatform.Plasmic, image: '/plasmic.png' },
    { label: 'GrapesJS', value: BuilderPlatform.GrapesJS, image: '/grapesJS.png' },
];

export function PlatformSelectionModal({ isOpen, onCancelAction, onConfirmAction }: PlatformSelectionModalProps) {
    const [selected, setSelected] = useState<BuilderPlatform | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [plasmicProjectId, setPlasmicProjectId] = useState('');

    const isDirty = !!title.trim() || !!url.trim() || !!plasmicProjectId.trim();

    const handleOpenChange = (open: boolean) => {
        if (!open && isLoading) return;
        if (!open && isDirty) {
            if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }
        }
        if (!open) onCancelAction();
    };

    const handleConfirm = async () => {
        if (!selected) {
            setError('Please select a platform.');
            return;
        }
        // Validation
        if (!title.trim()) {
            setError('Please enter a title.');
            return;
        }
        if (selected === BuilderPlatform.BuilderIO && !url.trim()) {
            setError('Please enter both a title and a URL.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await onConfirmAction({
                platform: selected,
                title,
                url,
                plasmicProjectId,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create block');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className={cn(
                "sm:max-w-[600px]",
                isLoading && "pointer-events-none opacity-70"
            )}>
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Select a builder platform
                    </DialogTitle>
                    <DialogDescription>
                        Choose a platform to create your new block. Each platform offers different features and capabilities.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    <RadioGroup
                        value={selected || ''}
                        onValueChange={(value: string) => setSelected(value as BuilderPlatform)}
                        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                    >
                        {platforms.map((platform) => (
                            <div key={platform.value}>
                                <RadioGroupItem
                                    value={platform.value}
                                    id={platform.value}
                                    className="peer sr-only"
                                    disabled={isLoading}
                                />
                                <Label
                                    htmlFor={platform.value}
                                    className={cn(
                                        "flex flex-col items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                                        "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                        "peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-950/50",
                                        "border-slate-200 dark:border-slate-800",
                                        "bg-white dark:bg-slate-900"
                                    )}
                                >
                                    <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden">
                                        <Image
                                            src={platform.image}
                                            alt={platform.label}
                                            width={48}
                                            height={48}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                        {platform.label}
                                    </span>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>

                    {/* Show title and URL fields only if Builder.io is selected */}
                    {selected === BuilderPlatform.BuilderIO && (
                        <div className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="builderio-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="builderio-title"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300"
                                    placeholder="Enter title"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label htmlFor="builderio-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Builder.io Page URL <span className="text-red-500">*</span>
                                </label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
                                        /builder/
                                    </span>
                                    <input
                                        type="text"
                                        id="builderio-url"
                                        value={url}
                                        onChange={e => setUrl(e.target.value)}
                                        className="flex-1 min-w-0 block w-full rounded-none rounded-r-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300"
                                        placeholder="e.g., home or about"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Show title and project ID fields only if Plasmic is selected */}
                    {selected === BuilderPlatform.Plasmic && (
                        <div className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="plasmic-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="plasmic-title"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300"
                                    placeholder="Enter title"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label htmlFor="plasmic-project-id" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Project ID <span className="text-slate-400">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    id="plasmic-project-id"
                                    value={plasmicProjectId}
                                    onChange={e => setPlasmicProjectId(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300"
                                    placeholder="Enter Plasmic Project ID (optional)"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}

                    {/* Show title input for GrapesJS or Craft.js */}
                    {(selected === BuilderPlatform.GrapesJS || selected === BuilderPlatform.CraftJS) && (
                        <div className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="generic-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="generic-title"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300"
                                    placeholder="Enter title"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-4 py-2 rounded-lg">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => handleOpenChange(false)}
                        disabled={isLoading}
                        className="border-slate-200 dark:border-slate-800 dark:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Block'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
