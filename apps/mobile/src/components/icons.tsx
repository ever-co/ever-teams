import React, { ComponentProps, ReactElement } from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';
// Each glyph from its own entry: Metro keeps what a module imports, so the whole set would ship with the app
import PlusSignIcon from '@hugeicons/core-free-icons/PlusSignIcon';
import AlertCircleIcon from '@hugeicons/core-free-icons/AlertCircleIcon';
import ArrowDown01Icon from '@hugeicons/core-free-icons/ArrowDown01Icon';
import ArrowLeft01Icon from '@hugeicons/core-free-icons/ArrowLeft01Icon';
import ArrowLeft02Icon from '@hugeicons/core-free-icons/ArrowLeft02Icon';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import ArrowUp01Icon from '@hugeicons/core-free-icons/ArrowUp01Icon';
import BellIcon from '@hugeicons/core-free-icons/BellIcon';
import Calendar03Icon from '@hugeicons/core-free-icons/Calendar03Icon';
import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import ChartHistogramIcon from '@hugeicons/core-free-icons/ChartHistogramIcon';
import CheckmarkCircle02Icon from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import CircleIcon from '@hugeicons/core-free-icons/CircleIcon';
import Clock01Icon from '@hugeicons/core-free-icons/Clock01Icon';
import ComputerIcon from '@hugeicons/core-free-icons/ComputerIcon';
import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import CornerDownRightIcon from '@hugeicons/core-free-icons/CornerDownRightIcon';
import DashedLineCircleIcon from '@hugeicons/core-free-icons/DashedLineCircleIcon';
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon';
import File01Icon from '@hugeicons/core-free-icons/File01Icon';
import Flag01Icon from '@hugeicons/core-free-icons/Flag01Icon';
import GitBranchIcon from '@hugeicons/core-free-icons/GitBranchIcon';
import GlobalIcon from '@hugeicons/core-free-icons/GlobalIcon';
import HierarchySquare02Icon from '@hugeicons/core-free-icons/HierarchySquare02Icon';
import InformationCircleIcon from '@hugeicons/core-free-icons/InformationCircleIcon';
import Layers01Icon from '@hugeicons/core-free-icons/Layers01Icon';
import Logout01Icon from '@hugeicons/core-free-icons/Logout01Icon';
import Mail01Icon from '@hugeicons/core-free-icons/Mail01Icon';
import Menu02Icon from '@hugeicons/core-free-icons/Menu02Icon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import MoreHorizontalIcon from '@hugeicons/core-free-icons/MoreHorizontalIcon';
import PencilEdit02Icon from '@hugeicons/core-free-icons/PencilEdit02Icon';
import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import RulerIcon from '@hugeicons/core-free-icons/RulerIcon';
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import Settings01Icon from '@hugeicons/core-free-icons/Settings01Icon';
import SquareLock01Icon from '@hugeicons/core-free-icons/SquareLock01Icon';
import Sun03Icon from '@hugeicons/core-free-icons/Sun03Icon';
import Tag01Icon from '@hugeicons/core-free-icons/Tag01Icon';
import Task01Icon from '@hugeicons/core-free-icons/Task01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import Timer02Icon from '@hugeicons/core-free-icons/Timer02Icon';
import UserIcon from '@hugeicons/core-free-icons/UserIcon';
import UserMultipleIcon from '@hugeicons/core-free-icons/UserMultipleIcon';

/**
 * Hugeicons is the icon family of the web, and the phone draws the same glyphs under the same names
 * (apps/web/core/components/icons/hugeicons.tsx): adding an icon means adding a line here, so every glyph shares the
 * web's stroke and sizing.
 */
type HugeiconsProps = ComponentProps<typeof HugeiconsIcon>;

export type IconProps = Omit<HugeiconsProps, 'icon' | 'altIcon' | 'showAlt'>;
export type IconComponent = ((props: IconProps) => ReactElement) & { displayName?: string };

const WEB_STROKE_WIDTH = 1.75;

function icon(glyph: HugeiconsProps['icon'], name: string): IconComponent {
	const Icon = (props: IconProps) => <HugeiconsIcon icon={glyph} strokeWidth={WEB_STROKE_WIDTH} {...props} />;
	Icon.displayName = name;
	return Icon;
}

// Navigation and chrome
export const ArrowLeft = icon(ArrowLeft02Icon, 'ArrowLeft');
export const ChevronDown = icon(ArrowDown01Icon, 'ChevronDown');
export const ChevronLeft = icon(ArrowLeft01Icon, 'ChevronLeft');
export const ChevronRight = icon(ArrowRight01Icon, 'ChevronRight');
export const ChevronUp = icon(ArrowUp01Icon, 'ChevronUp');
export const Globe = icon(GlobalIcon, 'Globe');
export const Menu = icon(Menu02Icon, 'Menu');
export const Moon = icon(Moon02Icon, 'Moon');
export const MoreHorizontal = icon(MoreHorizontalIcon, 'MoreHorizontal');
export const Search = icon(Search01Icon, 'Search');
export const Sun = icon(Sun03Icon, 'Sun');
export const X = icon(Cancel01Icon, 'X');
export const Desktop = icon(ComputerIcon, 'Desktop');

// People and account
export const Bell = icon(BellIcon, 'Bell');
export const Lock = icon(SquareLock01Icon, 'Lock');
export const LogOut = icon(Logout01Icon, 'LogOut');
export const Mail = icon(Mail01Icon, 'Mail');
export const Settings = icon(Settings01Icon, 'Settings');
export const User = icon(UserIcon, 'User');
export const Users = icon(UserMultipleIcon, 'Users');

// Tasks and time
export const Calendar = icon(Calendar03Icon, 'Calendar');
export const Chart = icon(ChartHistogramIcon, 'Chart');
export const Clock = icon(Clock01Icon, 'Clock');
export const Flag = icon(Flag01Icon, 'Flag');
export const Layers = icon(Layers01Icon, 'Layers');
export const ParentTask = icon(CornerDownRightIcon, 'ParentTask');
export const Play = icon(PlayIcon, 'Play');
export const Ruler = icon(RulerIcon, 'Ruler');
export const StatusCircle = icon(DashedLineCircleIcon, 'StatusCircle');
export const SubTasks = icon(HierarchySquare02Icon, 'SubTasks');
export const Tag = icon(Tag01Icon, 'Tag');
export const Task = icon(Task01Icon, 'Task');
export const Timer = icon(Timer02Icon, 'Timer');
export const Version = icon(GitBranchIcon, 'Version');

// Actions and states
export const Check = icon(Tick02Icon, 'Check');
export const Circle = icon(CircleIcon, 'Circle');
export const CircleAlert = icon(AlertCircleIcon, 'CircleAlert');
export const CircleCheck = icon(CheckmarkCircle02Icon, 'CircleCheck');
export const Copy = icon(Copy01Icon, 'Copy');
export const FileText = icon(File01Icon, 'FileText');
export const Info = icon(InformationCircleIcon, 'Info');
export const Pencil = icon(PencilEdit02Icon, 'Pencil');
export const Plus = icon(PlusSignIcon, 'Plus');
export const Trash = icon(Delete02Icon, 'Trash');
