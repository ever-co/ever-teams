import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../src/components/ui/dialog';
import { Button } from '../../../src/components/ui/button';

interface BuilderFallbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    setTitle: (title: string) => void;
    url: string;
    setUrl: (url: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export const BuilderFallbackModal: React.FC<BuilderFallbackModalProps> = ({
    open,
    onOpenChange,
    title,
    setTitle,
    url,
    setUrl,
    onSubmit,
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold mb-4 text-slate-900 dark:text-slate-100">Create Builder.io Block</DialogTitle>
            </DialogHeader>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
                Please enter a title and Builder.io Page URL to create your first block.
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label htmlFor="fallback-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Title
                    </label>
                    <input
                        type="text"
                        id="fallback-title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300"
                        placeholder="Enter title"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="fallback-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Builder.io Page URL
                    </label>
                    <input
                        type="text"
                        id="fallback-url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300"
                        placeholder="e.g., /home or /about"
                        required
                    />
                </div>
                <DialogFooter className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                        Cancel
                    </Button>
                    <Button type="submit" className="w-full">Create Block</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
);
