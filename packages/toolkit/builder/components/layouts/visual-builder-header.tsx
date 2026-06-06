import React, { useState, useEffect } from 'react';
import { TeamsLogo } from '@ever-teams/toolkit-ui';
import { Button } from '@/components/ui/button';
import { ThemeToggle, TeamsLoginDialog } from '@ever-teams/atoms';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface VisualBuilderHeaderProps {
    title: string;
    onTitleChange: (newTitle: string) => void;
    platform: string;
    onBack?: () => void;
    userAvatar?: React.ReactNode;
    hidePlatform?: boolean;
    logoSize?: 'default' | 'large';
    hideEditButton?: boolean;
    hideBackButton?: boolean;
}

export const VisualBuilderHeader: React.FC<VisualBuilderHeaderProps> = ({
    title,
    onTitleChange,
    platform,
    onBack,
    userAvatar,
    hidePlatform = false,
    logoSize = 'default',
    hideEditButton = false,
    hideBackButton = false
}) => {
    const [editing, setEditing] = useState(false);
    const [tempTitle, setTempTitle] = useState(title);
    const [isNavigating, setIsNavigating] = useState(false);
    const router = useRouter();

    // Keep tempTitle in sync with title prop
    useEffect(() => {
        setTempTitle(title);
    }, [title]);

    const handleEdit = () => {
        setTempTitle(title);
        setEditing(true);
    };

    const handleSave = () => {
        if (tempTitle.trim() && tempTitle !== title) {
            onTitleChange(tempTitle.trim());
        }
        setEditing(false);
    };

    const handleCancel = () => {
        setTempTitle(title);
        setEditing(false);
    };

    const handleBackClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsNavigating(true);
        router.push('/blocks');
    };

    return (
        <header className="sticky top-0 z-50 w-full bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4 min-w-0">
                    <Link href="/blocks" className="hover:opacity-80 transition-opacity">
                        <TeamsLogo className={logoSize === 'large' ? "h-12 w-32" : "h-12 w-12"} />
                    </Link>
                    {editing ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={tempTitle}
                                onChange={e => setTempTitle(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSave();
                                    if (e.key === 'Escape') handleCancel();
                                }}
                                autoFocus
                                className="text-xl font-bold max-w-xs dark:text-white"
                            />
                            <Button size="sm" variant="ghost" onClick={handleSave}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs" title={title}>{title}</span>
                            {!hideEditButton && (
                                <Button size="icon" variant="ghost" onClick={handleEdit} aria-label="Edit title">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6l11-11a2.828 2.828 0 0 0-4-4L5 17v4z" /></svg>
                                </Button>
                            )}
                        </div>
                    )}
                    {!hidePlatform && (
                        <span className="ml-3 px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold uppercase tracking-wide">
                            {platform}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {!hideBackButton && (
                        <Button
                            variant="outline"
                            className="flex items-center gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white"
                            onClick={handleBackClick}
                            disabled={isNavigating}
                        >
                            {isNavigating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <ArrowLeft className="h-4 w-4" />
                            )}
                            Back to Blocks List
                        </Button>
                    )}
                    <ThemeToggle />
                    {/* {userAvatar} */}
                    <TeamsLoginDialog />
                </div>
            </div>
        </header>
    );
};
