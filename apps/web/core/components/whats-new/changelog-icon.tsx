import {
	Bell,
	Bot,
	Briefcase,
	Calendar,
	Chart,
	Clock,
	CreditCard,
	Cube,
	Download,
	FileText,
	Gift,
	Globe,
	GridView,
	Inbox,
	Integration,
	Key,
	Layers,
	ListTodo,
	Lock,
	Megaphone,
	MessageCircle,
	MessageSquare,
	Preferences,
	Settings,
	ShieldCheck,
	Star,
	Users
} from '@/core/components/icons';
import type { IconComponent } from '@/core/components/icons/hugeicons';

/**
 * The changelog names its icons the Eva way (`message-circle-outline`), as Gauzy's What's New draws them. This maps
 * those names onto this app's icons; anything else gets the megaphone.
 */
const CHANGELOG_ICONS: Record<string, IconComponent> = {
	'bar-chart': Chart,
	'pie-chart': Chart,
	activity: Chart,
	bell: Bell,
	briefcase: Briefcase,
	calendar: Calendar,
	clock: Clock,
	'color-palette': Preferences,
	options: Preferences,
	'options-2': Preferences,
	'credit-card': CreditCard,
	cube: Cube,
	download: Download,
	'file-text': FileText,
	file: FileText,
	flash: Bot,
	gift: Gift,
	globe: Globe,
	'globe-2': Globe,
	grid: GridView,
	inbox: Inbox,
	'git-merge': Integration,
	'git-pull-request': Integration,
	link: Integration,
	'log-in': Key,
	lock: Lock,
	layers: Layers,
	list: ListTodo,
	'checkmark-square': ListTodo,
	'message-circle': MessageCircle,
	'message-square': MessageSquare,
	people: Users,
	person: Users,
	settings: Settings,
	'settings-2': Settings,
	shield: ShieldCheck,
	star: Star
};

/** A changelog icon name as the map keys it: trimmed, lowercased, `-outline` / `-fill` suffix dropped. */
function toIconKey(name: string | null | undefined): string {
	return (name ?? '')
		.trim()
		.toLowerCase()
		.replace(/-(outline|fill)$/, '');
}

/** The app's icon for a changelog icon name; the megaphone for any name it does not know. */
export function getChangelogIcon(name: string | null | undefined): IconComponent {
	return CHANGELOG_ICONS[toIconKey(name)] ?? Megaphone;
}

export function ChangelogIcon({ name, className }: Readonly<{ name: string | null | undefined; className?: string }>) {
	const key = toIconKey(name);
	const Icon = CHANGELOG_ICONS[key] ?? Megaphone;
	return <Icon className={className} aria-hidden="true" />;
}
