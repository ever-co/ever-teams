import {
	Plug01Icon,
	GitBranchIcon,
	DashedLineCircleIcon,
	PaintBoardIcon,
	AddCircleIcon,
	CornerDownRightIcon,
	HierarchySquare02Icon,
	Alert02Icon,
	AlertCircleIcon,
	Analytics01Icon,
	Archive02Icon,
	ArrowDown01Icon,
	ArrowLeft01Icon,
	ArrowLeft02Icon,
	ArrowRight01Icon,
	ArrowRight02Icon,
	ArrowUp01Icon,
	ArrowUp02Icon,
	ArrowUpDownIcon,
	ArrowUpRight01Icon,
	Attachment01Icon,
	Doc01Icon,
	Download01Icon,
	MusicNote01Icon,
	Pdf01Icon,
	Ppt01Icon,
	Xls01Icon,
	Zip01Icon,
	BankIcon,
	BellIcon,
	Bookmark01Icon,
	BotIcon,
	Briefcase01Icon,
	BubbleChatIcon,
	Bug01Icon,
	Building03Icon,
	Calendar03Icon,
	Call02Icon,
	Camera01Icon,
	Cancel01Icon,
	Certificate01Icon,
	Coffee02Icon,
	ChampionIcon,
	ChartHistogramIcon,
	ChartIncreaseIcon,
	CheckmarkBadge01Icon,
	CheckmarkCircle02Icon,
	CircleIcon,
	Clock01Icon,
	CommandIcon,
	Comment01Icon,
	Copy01Icon,
	CreditCardIcon,
	CubeIcon,
	DashboardSquare01Icon,
	Delete02Icon,
	DollarCircleIcon,
	DragDropVerticalIcon,
	Facebook01Icon,
	FavouriteIcon,
	File01Icon,
	FileSearchIcon,
	FilterHorizontalIcon,
	Flag01Icon,
	Flag02Icon,
	Folder01Icon,
	Folder02Icon,
	GiftIcon,
	GlobalIcon,
	GridViewIcon,
	HandshakeIcon,
	HelpCircleIcon,
	HistoryIcon,
	Home01Icon,
	Image01Icon,
	ImageAdd01Icon,
	ImageNotFound01Icon,
	InboxIcon,
	InboxCheckIcon,
	InformationCircleIcon,
	InstagramIcon,
	JusticeScale01Icon,
	KanbanIcon,
	Key01Icon,
	KeyboardIcon,
	LanguageSquareIcon,
	Layers01Icon,
	LicenseIcon,
	Link01Icon,
	Linkedin01Icon,
	LinkSquare02Icon,
	ListViewIcon,
	Loading03Icon,
	Location01Icon,
	Logout01Icon,
	Logout03Icon,
	Mail01Icon,
	Megaphone01Icon,
	MailOpen01Icon,
	Maximize01Icon,
	Menu02Icon,
	Message01Icon,
	MessageBlockedIcon,
	Mic01Icon,
	MinusSignIcon,
	MoneyBag01Icon,
	Moon02Icon,
	MoreHorizontalIcon,
	MoreVerticalIcon,
	Mortarboard01Icon,
	NewTwitterIcon,
	NoteEditIcon,
	Notification03Icon,
	NotificationOff01Icon,
	PauseCircleIcon,
	PauseIcon,
	PencilEdit02Icon,
	PlayCircleIcon,
	PlayIcon,
	PlusSignIcon,
	QrCodeIcon,
	RotateLeft01Icon,
	RulerIcon,
	Search01Icon,
	Sent02Icon,
	Settings01Icon,
	Share08Icon,
	ShieldCheckIcon,
	ShieldUserIcon,
	SidebarLeft01Icon,
	SmartPhone01Icon,
	Sorting05Icon,
	SquareLock01Icon,
	StarIcon,
	SmileIcon,
	AtIcon,
	StopCircleIcon,
	StopIcon,
	Sun03Icon,
	Table01Icon,
	Tag01Icon,
	Task01Icon,
	TaskDaily01Icon,
	TaskDone01Icon,
	ThumbsUpIcon,
	Tick02Icon,
	TickDouble02Icon,
	Timer02Icon,
	UmbrellaIcon,
	UnfoldMoreIcon,
	Upload01Icon,
	UserAdd01Icon,
	UserBlock01Icon,
	UserCheck01Icon,
	UserCircleIcon,
	UserGroupIcon,
	UserIcon,
	UserIdVerificationIcon,
	UserMultipleIcon,
	UserRemove01Icon,
	Video01Icon,
	ViewIcon,
	ViewOffIcon,
	Wallet01Icon,
	WhatsappIcon,
	Wrench01Icon,
	TextBoldIcon,
	TextItalicIcon,
	TextUnderlineIcon,
	TextStrikethroughIcon,
	SourceCodeIcon,
	CodeSquareIcon,
	Heading01Icon,
	Heading02Icon,
	Heading03Icon,
	LeftToRightListBulletIcon,
	LeftToRightListNumberIcon,
	CheckListIcon,
	LeftToRightBlockQuoteIcon,
	TextIcon,
	QuillWrite02Icon,
	UndoIcon,
	RedoIcon,
	TextAlignLeftIcon,
	TextAlignCenterIcon,
	TextAlignRightIcon,
	TextAlignJustifyLeftIcon,
	Shield01Icon,
	UserSettings01Icon,
	RefreshIcon,
	ComputerIcon,
	ArrowTurnUpIcon,
	LifebuoyIcon,
	MailValidation01Icon,
	ArrowDown02Icon,
	ArrowDownDoubleIcon,
	ArrowUpDoubleIcon,
	CancelCircleIcon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { ComponentProps, ReactElement } from 'react';

/**
 * Hugeicons is the icon library of the app, and no screen imports it directly:
 * adding an icon means adding a line here, so every glyph shares the same stroke and sizing.
 */
type HugeiconsProps = ComponentProps<typeof HugeiconsIcon>;

export type IconProps = Omit<HugeiconsProps, 'icon' | 'altIcon' | 'showAlt'>;
export type IconComponent = ((props: IconProps) => ReactElement) & { displayName?: string };

function icon(glyph: HugeiconsProps['icon'], name: string): IconComponent {
	const Icon = (props: IconProps) => <HugeiconsIcon icon={glyph} strokeWidth={1.75} {...props} />;
	Icon.displayName = name;
	return Icon;
}

// Navigation and chrome
export const ArrowLeft = /*#__PURE__*/ icon(ArrowLeft02Icon, 'ArrowLeft');
export const ArrowRight = /*#__PURE__*/ icon(ArrowRight02Icon, 'ArrowRight');
export const ArrowUpRight = /*#__PURE__*/ icon(ArrowUpRight01Icon, 'ArrowUpRight');
export const ChevronDown = /*#__PURE__*/ icon(ArrowDown01Icon, 'ChevronDown');
export const ChevronLeft = /*#__PURE__*/ icon(ArrowLeft01Icon, 'ChevronLeft');
export const ChevronRight = /*#__PURE__*/ icon(ArrowRight01Icon, 'ChevronRight');
export const ChevronUp = /*#__PURE__*/ icon(ArrowUp01Icon, 'ChevronUp');
export const ChevronsUpDown = /*#__PURE__*/ icon(UnfoldMoreIcon, 'ChevronsUpDown');
export const Expand = /*#__PURE__*/ icon(Maximize01Icon, 'Expand');
export const ExternalLink = /*#__PURE__*/ icon(LinkSquare02Icon, 'ExternalLink');
export const Globe = /*#__PURE__*/ icon(GlobalIcon, 'Globe');
export const Home = /*#__PURE__*/ icon(Home01Icon, 'Home');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Language = /*#__PURE__*/ icon(LanguageSquareIcon, 'Language');
export const LayoutGrid = /*#__PURE__*/ icon(GridViewIcon, 'LayoutGrid');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Menu = /*#__PURE__*/ icon(Menu02Icon, 'Menu');
export const Moon = /*#__PURE__*/ icon(Moon02Icon, 'Moon');
export const MoreHorizontal = /*#__PURE__*/ icon(MoreHorizontalIcon, 'MoreHorizontal');
export const MoreVertical = /*#__PURE__*/ icon(MoreVerticalIcon, 'MoreVertical');
export const Search = /*#__PURE__*/ icon(Search01Icon, 'Search');
export const SlidersHorizontal = /*#__PURE__*/ icon(FilterHorizontalIcon, 'SlidersHorizontal');
export const Sun = /*#__PURE__*/ icon(Sun03Icon, 'Sun');
export const X = /*#__PURE__*/ icon(Cancel01Icon, 'X');

// Marketplace
export const Bell = /*#__PURE__*/ icon(BellIcon, 'Bell');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const BellOff = /*#__PURE__*/ icon(NotificationOff01Icon, 'BellOff');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Bookmark = /*#__PURE__*/ icon(Bookmark01Icon, 'Bookmark');
export const Briefcase = /*#__PURE__*/ icon(Briefcase01Icon, 'Briefcase');
export const Building = /*#__PURE__*/ icon(Building03Icon, 'Building');
export const Calendar = /*#__PURE__*/ icon(Calendar03Icon, 'Calendar');
export const Camera = /*#__PURE__*/ icon(Camera01Icon, 'Camera');
export const Clock = /*#__PURE__*/ icon(Clock01Icon, 'Clock');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Bank = /*#__PURE__*/ icon(BankIcon, 'Bank');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const CreditCard = /*#__PURE__*/ icon(CreditCardIcon, 'CreditCard');
export const DollarCircle = /*#__PURE__*/ icon(DollarCircleIcon, 'DollarCircle');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Gift = /*#__PURE__*/ icon(GiftIcon, 'Gift');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Heart = /*#__PURE__*/ icon(FavouriteIcon, 'Heart');
export const Image = /*#__PURE__*/ icon(Image01Icon, 'Image');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const ImageOff = /*#__PURE__*/ icon(ImageNotFound01Icon, 'ImageOff');
export const ImagePlus = /*#__PURE__*/ icon(ImageAdd01Icon, 'ImagePlus');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const MapPin = /*#__PURE__*/ icon(Location01Icon, 'MapPin');
export const MessageCircle = /*#__PURE__*/ icon(BubbleChatIcon, 'MessageCircle');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const MessageSquare = /*#__PURE__*/ icon(Message01Icon, 'MessageSquare');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const MessageBlocked = /*#__PURE__*/ icon(MessageBlockedIcon, 'MessageBlocked');
export const Mic = /*#__PURE__*/ icon(Mic01Icon, 'Mic');
export const MoneyBag = /*#__PURE__*/ icon(MoneyBag01Icon, 'MoneyBag');
export const Pause = /*#__PURE__*/ icon(PauseIcon, 'Pause');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const PauseCircle = /*#__PURE__*/ icon(PauseCircleIcon, 'PauseCircle');
export const Play = /*#__PURE__*/ icon(PlayIcon, 'Play');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const PlayCircle = /*#__PURE__*/ icon(PlayCircleIcon, 'PlayCircle');
export const Send = /*#__PURE__*/ icon(Sent02Icon, 'Send');
export const Share = /*#__PURE__*/ icon(Share08Icon, 'Share');
export const Star = /*#__PURE__*/ icon(StarIcon, 'Star');
export const Smile = /*#__PURE__*/ icon(SmileIcon, 'Smile');
export const AtSign = /*#__PURE__*/ icon(AtIcon, 'AtSign');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const ThumbsUp = /*#__PURE__*/ icon(ThumbsUpIcon, 'ThumbsUp');
export const Wrench = /*#__PURE__*/ icon(Wrench01Icon, 'Wrench');

// Account and trust
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const BadgeCheck = /*#__PURE__*/ icon(CheckmarkBadge01Icon, 'BadgeCheck');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Certificate = /*#__PURE__*/ icon(Certificate01Icon, 'Certificate');
export const Flag = /*#__PURE__*/ icon(Flag01Icon, 'Flag');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const HelpCircle = /*#__PURE__*/ icon(HelpCircleIcon, 'HelpCircle');
export const Lock = /*#__PURE__*/ icon(SquareLock01Icon, 'Lock');
export const LogOut = /*#__PURE__*/ icon(Logout01Icon, 'LogOut');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Scale = /*#__PURE__*/ icon(JusticeScale01Icon, 'Scale');
export const Settings = /*#__PURE__*/ icon(Settings01Icon, 'Settings');
export const ShieldCheck = /*#__PURE__*/ icon(ShieldCheckIcon, 'ShieldCheck');
export const User = /*#__PURE__*/ icon(UserIcon, 'User');
export const UserAdd = /*#__PURE__*/ icon(UserAdd01Icon, 'UserAdd');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const UserBlock = /*#__PURE__*/ icon(UserBlock01Icon, 'UserBlock');
export const UserCircle = /*#__PURE__*/ icon(UserCircleIcon, 'UserCircle');
export const UserRemove = /*#__PURE__*/ icon(UserRemove01Icon, 'UserRemove');
export const Users = /*#__PURE__*/ icon(UserMultipleIcon, 'Users');
export const Wallet = /*#__PURE__*/ icon(Wallet01Icon, 'Wallet');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const IdCard = /*#__PURE__*/ icon(UserIdVerificationIcon, 'IdCard');
export const ShieldUser = /*#__PURE__*/ icon(ShieldUserIcon, 'ShieldUser');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const License = /*#__PURE__*/ icon(LicenseIcon, 'License');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Mortarboard = /*#__PURE__*/ icon(Mortarboard01Icon, 'Mortarboard');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Umbrella = /*#__PURE__*/ icon(UmbrellaIcon, 'Umbrella');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Handshake = /*#__PURE__*/ icon(HandshakeIcon, 'Handshake');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Trophy = /*#__PURE__*/ icon(ChampionIcon, 'Trophy');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const TrendingUp = /*#__PURE__*/ icon(ChartIncreaseIcon, 'TrendingUp');
export const UserCheck = /*#__PURE__*/ icon(UserCheck01Icon, 'UserCheck');

// Feedback and editing
export const Alert = /*#__PURE__*/ icon(Alert02Icon, 'Alert');
export const Archive = /*#__PURE__*/ icon(Archive02Icon, 'Archive');
export const Check = /*#__PURE__*/ icon(Tick02Icon, 'Check');
export const Circle = /*#__PURE__*/ icon(CircleIcon, 'Circle');
export const CircleAlert = /*#__PURE__*/ icon(AlertCircleIcon, 'CircleAlert');
export const CircleCheck = /*#__PURE__*/ icon(CheckmarkCircle02Icon, 'CircleCheck');
export const Copy = /*#__PURE__*/ icon(Copy01Icon, 'Copy');
export const Eye = /*#__PURE__*/ icon(ViewIcon, 'Eye');
export const EyeOff = /*#__PURE__*/ icon(ViewOffIcon, 'EyeOff');
export const FileText = /*#__PURE__*/ icon(File01Icon, 'FileText');
export const FileSearch = /*#__PURE__*/ icon(FileSearchIcon, 'FileSearch');
export const Folder = /*#__PURE__*/ icon(Folder01Icon, 'Folder');
export const Inbox = /*#__PURE__*/ icon(InboxIcon, 'Inbox');
export const Info = /*#__PURE__*/ icon(InformationCircleIcon, 'Info');
export const Loader = /*#__PURE__*/ icon(Loading03Icon, 'Loader');
export const Minus = /*#__PURE__*/ icon(MinusSignIcon, 'Minus');
export const Pencil = /*#__PURE__*/ icon(PencilEdit02Icon, 'Pencil');
export const Plus = /*#__PURE__*/ icon(PlusSignIcon, 'Plus');
export const PlusCircle = /*#__PURE__*/ icon(AddCircleIcon, 'PlusCircle');
export const RotateLeft = /*#__PURE__*/ icon(RotateLeft01Icon, 'RotateLeft');
export const Ruler = /*#__PURE__*/ icon(RulerIcon, 'Ruler');
export const Trash = /*#__PURE__*/ icon(Delete02Icon, 'Trash');
export const Upload = /*#__PURE__*/ icon(Upload01Icon, 'Upload');
export const Video = /*#__PURE__*/ icon(Video01Icon, 'Video');

// Contact and devices
export const Mail = /*#__PURE__*/ icon(Mail01Icon, 'Mail');
export const MailOpen = /*#__PURE__*/ icon(MailOpen01Icon, 'MailOpen');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Phone = /*#__PURE__*/ icon(Call02Icon, 'Phone');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const QrCode = /*#__PURE__*/ icon(QrCodeIcon, 'QrCode');
export const Smartphone = /*#__PURE__*/ icon(SmartPhone01Icon, 'Smartphone');

// Brands
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Facebook = /*#__PURE__*/ icon(Facebook01Icon, 'Facebook');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Instagram = /*#__PURE__*/ icon(InstagramIcon, 'Instagram');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Linkedin = /*#__PURE__*/ icon(Linkedin01Icon, 'Linkedin');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Whatsapp = /*#__PURE__*/ icon(WhatsappIcon, 'Whatsapp');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const XSocial = /*#__PURE__*/ icon(NewTwitterIcon, 'XSocial');

// Work: views, tasks, time, collaboration
export const ListView = /*#__PURE__*/ icon(ListViewIcon, 'ListView');
export const Table = /*#__PURE__*/ icon(Table01Icon, 'Table');
export const GridView = /*#__PURE__*/ icon(GridViewIcon, 'GridView');
export const Kanban = /*#__PURE__*/ icon(KanbanIcon, 'Kanban');
export const Timer = /*#__PURE__*/ icon(Timer02Icon, 'Timer');
export const Idle = /*#__PURE__*/ icon(Coffee02Icon, 'Idle');
export const Task = /*#__PURE__*/ icon(Task01Icon, 'Task');
export const TaskDone = /*#__PURE__*/ icon(TaskDone01Icon, 'TaskDone');
export const TaskDaily = /*#__PURE__*/ icon(TaskDaily01Icon, 'TaskDaily');
export const StopCircle = /*#__PURE__*/ icon(StopCircleIcon, 'StopCircle');
export const Stop = /*#__PURE__*/ icon(StopIcon, 'Stop');
export const Tag = /*#__PURE__*/ icon(Tag01Icon, 'Tag');
export const Attachment = /*#__PURE__*/ icon(Attachment01Icon, 'Attachment');
export const Download = /*#__PURE__*/ icon(Download01Icon, 'Download');
export const FileDoc = /*#__PURE__*/ icon(Doc01Icon, 'FileDoc');
export const FilePdf = /*#__PURE__*/ icon(Pdf01Icon, 'FilePdf');
export const FileSheet = /*#__PURE__*/ icon(Xls01Icon, 'FileSheet');
export const FileSlides = /*#__PURE__*/ icon(Ppt01Icon, 'FileSlides');
export const FileZip = /*#__PURE__*/ icon(Zip01Icon, 'FileZip');
export const FileAudio = /*#__PURE__*/ icon(MusicNote01Icon, 'FileAudio');
export const Comment = /*#__PURE__*/ icon(Comment01Icon, 'Comment');
export const Link = /*#__PURE__*/ icon(Link01Icon, 'Link');
export const Sort = /*#__PURE__*/ icon(Sorting05Icon, 'Sort');
export const Filter = /*#__PURE__*/ icon(FilterHorizontalIcon, 'Filter');
export const DragHandle = /*#__PURE__*/ icon(DragDropVerticalIcon, 'DragHandle');
export const CheckDouble = /*#__PURE__*/ icon(TickDouble02Icon, 'CheckDouble');
export const Sidebar = /*#__PURE__*/ icon(SidebarLeft01Icon, 'Sidebar');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Command = /*#__PURE__*/ icon(CommandIcon, 'Command');
export const Keyboard = /*#__PURE__*/ icon(KeyboardIcon, 'Keyboard');
export const Chart = /*#__PURE__*/ icon(ChartHistogramIcon, 'Chart');
export const Analytics = /*#__PURE__*/ icon(Analytics01Icon, 'Analytics');
export const UsersGroup = /*#__PURE__*/ icon(UserGroupIcon, 'UsersGroup');
export const Layers = /*#__PURE__*/ icon(Layers01Icon, 'Layers');
export const Cube = /*#__PURE__*/ icon(CubeIcon, 'Cube');
export const FlagPriority = /*#__PURE__*/ icon(Flag02Icon, 'FlagPriority');
export const Dashboard = /*#__PURE__*/ icon(DashboardSquare01Icon, 'Dashboard');
export const FolderOpen = /*#__PURE__*/ icon(Folder02Icon, 'FolderOpen');
export const Edit = /*#__PURE__*/ icon(PencilEdit02Icon, 'Edit');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Logout = /*#__PURE__*/ icon(Logout03Icon, 'Logout');
export const Notification = /*#__PURE__*/ icon(Notification03Icon, 'Notification');
export const InformationCircle = /*#__PURE__*/ icon(InformationCircleIcon, 'InformationCircle');
export const Spinner = /*#__PURE__*/ icon(Loading03Icon, 'Spinner');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const ArrowUpDown = /*#__PURE__*/ icon(ArrowUpDownIcon, 'ArrowUpDown');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const MicOn = /*#__PURE__*/ icon(Mic01Icon, 'MicOn');
export const VideoCall = /*#__PURE__*/ icon(Video01Icon, 'VideoCall');
/** @public Part of the icon set; no screen uses it (Knip, 2026-11-06). */
export const Inbox2 = /*#__PURE__*/ icon(InboxIcon, 'Inbox2');
export const InboxCheck = /*#__PURE__*/ icon(InboxCheckIcon, 'InboxCheck');
export const Megaphone = /*#__PURE__*/ icon(Megaphone01Icon, 'Megaphone');
export const Bug = /*#__PURE__*/ icon(Bug01Icon, 'Bug');
export const CheckCircle2 = /*#__PURE__*/ icon(CheckmarkCircle02Icon, 'CheckCircle2');
export const Bot = /*#__PURE__*/ icon(BotIcon, 'Bot');
export const ArrowUp = /*#__PURE__*/ icon(ArrowUp02Icon, 'ArrowUp');
export const ArrowDown = /*#__PURE__*/ icon(ArrowDown02Icon, 'ArrowDown');
export const ChevronsDown = /*#__PURE__*/ icon(ArrowDownDoubleIcon, 'ChevronsDown');
export const ChevronsUp = /*#__PURE__*/ icon(ArrowUpDoubleIcon, 'ChevronsUp');
/** @public Part of the icon set; no screen uses it since the sweep of 2026-11-05 (#4905, #4914). */
export const Refresh = /*#__PURE__*/ icon(RefreshIcon, 'Refresh');
export const CircleX = /*#__PURE__*/ icon(CancelCircleIcon, 'CircleX');
/** @public Part of the icon set; no screen uses it since the sweep of 2026-11-05 (#4905, #4914). */
export const MailCheck = /*#__PURE__*/ icon(MailValidation01Icon, 'MailCheck');
export const Shield = /*#__PURE__*/ icon(Shield01Icon, 'Shield');
export const UserSettings = /*#__PURE__*/ icon(UserSettings01Icon, 'UserSettings');
export const Desktop = /*#__PURE__*/ icon(ComputerIcon, 'Desktop');
export const ArrowTurnUp = /*#__PURE__*/ icon(ArrowTurnUpIcon, 'ArrowTurnUp');
export const Lifebuoy = /*#__PURE__*/ icon(LifebuoyIcon, 'Lifebuoy');
export const History = /*#__PURE__*/ icon(HistoryIcon, 'History');
export const Key = /*#__PURE__*/ icon(Key01Icon, 'Key');
export const Compose = /*#__PURE__*/ icon(NoteEditIcon, 'Compose');

// Rich text editor
export const Bold = /*#__PURE__*/ icon(TextBoldIcon, 'Bold');
export const Italic = /*#__PURE__*/ icon(TextItalicIcon, 'Italic');
export const Underline = /*#__PURE__*/ icon(TextUnderlineIcon, 'Underline');
export const Strikethrough = /*#__PURE__*/ icon(TextStrikethroughIcon, 'Strikethrough');
export const InlineCode = /*#__PURE__*/ icon(SourceCodeIcon, 'InlineCode');
export const CodeBlock = /*#__PURE__*/ icon(CodeSquareIcon, 'CodeBlock');
export const Heading1 = /*#__PURE__*/ icon(Heading01Icon, 'Heading1');
export const Heading2 = /*#__PURE__*/ icon(Heading02Icon, 'Heading2');
export const Heading3 = /*#__PURE__*/ icon(Heading03Icon, 'Heading3');
export const ListBullet = /*#__PURE__*/ icon(LeftToRightListBulletIcon, 'ListBullet');
export const ListNumbered = /*#__PURE__*/ icon(LeftToRightListNumberIcon, 'ListNumbered');
export const ListTodo = /*#__PURE__*/ icon(CheckListIcon, 'ListTodo');
export const Quote = /*#__PURE__*/ icon(LeftToRightBlockQuoteIcon, 'Quote');
export const Paragraph = /*#__PURE__*/ icon(TextIcon, 'Paragraph');
export const WritingHelp = /*#__PURE__*/ icon(QuillWrite02Icon, 'WritingHelp');
export const Undo = /*#__PURE__*/ icon(UndoIcon, 'Undo');
export const Redo = /*#__PURE__*/ icon(RedoIcon, 'Redo');
export const AlignLeft = /*#__PURE__*/ icon(TextAlignLeftIcon, 'AlignLeft');
export const AlignCenter = /*#__PURE__*/ icon(TextAlignCenterIcon, 'AlignCenter');
export const AlignRight = /*#__PURE__*/ icon(TextAlignRightIcon, 'AlignRight');
export const AlignJustify = /*#__PURE__*/ icon(TextAlignJustifyLeftIcon, 'AlignJustify');
export const SubTasks = /*#__PURE__*/ icon(HierarchySquare02Icon, 'SubTasks');
export const ParentTask = /*#__PURE__*/ icon(CornerDownRightIcon, 'ParentTask');
export const Integration = /*#__PURE__*/ icon(Plug01Icon, 'Integration');
export const Version = /*#__PURE__*/ icon(GitBranchIcon, 'Version');
export const StatusCircle = /*#__PURE__*/ icon(DashedLineCircleIcon, 'StatusCircle');
export const Preferences = /*#__PURE__*/ icon(PaintBoardIcon, 'Preferences');
