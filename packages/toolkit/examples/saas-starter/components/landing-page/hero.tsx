import { Button } from '@ever-teams/toolkit-ui';
import { ArrowRight, Play, Badge, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { JSX, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

// Custom Video Modal Component
interface VideoModalProps {
	isOpen: boolean;
	onClose: () => void;
	videoUrl: string;
}

function VideoModal({ isOpen, onClose, videoUrl }: VideoModalProps): JSX.Element | null {
	const [isLoading, setIsLoading] = useState(true);

	// Handle ESC key press
	useEffect(() => {
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			// Prevent body scroll when modal is open
			document.body.style.overflow = 'hidden';
			// Reset loading state when modal opens
			setIsLoading(true);
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = 'unset';
		};
	}, [isOpen, onClose]);

	// Reset loading state when modal closes
	useEffect(() => {
		if (!isOpen) {
			setIsLoading(true);
		}
	}, [isOpen]);

	if (!isOpen) return null;

	// Extract video ID from Loom URL for embedding
	const getEmbedUrl = (url: string) => {
		const match = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
		if (match) {
			return `https://www.loom.com/embed/${match[1]}`;
		}
		return url;
	};

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

			{/* Modal Content */}
			<div className="relative z-10 w-full max-w-7xl mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-300">
				{/* Close Button */}
				<button
					onClick={onClose}
					className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors duration-200"
					aria-label="Close video modal"
				>
					<X size={20} />
				</button>

				{/* Video Container */}
				<div className="relative w-full" style={{ paddingBottom: '56.25%' /* 16:9 aspect ratio */ }}>
					{/* Loading Indicator */}
					{isLoading && (
						<div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
							<div className="flex flex-col items-center space-y-4">
								{/* Spinning loader */}
								<div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
							</div>
						</div>
					)}

					<iframe
						src={getEmbedUrl(videoUrl)}
						className="absolute inset-0 w-full h-full border-0"
						allowFullScreen
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						title="Demo Video"
						onLoad={() => setIsLoading(false)}
						style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}
					/>
				</div>
			</div>
		</div>
	);
}

export function HeroSection(): JSX.Element {
	const t = useTranslations('Hero');
	const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

	const videoUrl =
		'https://www.loom.com/share/558229eee7b04825a570eeae443b470c?sid=e88050ba-5162-4e83-af14-56e609753d3b';

	const openVideoModal = () => setIsVideoModalOpen(true);
	const closeVideoModal = () => setIsVideoModalOpen(false);
	return (
		<section className="relative z-10 pt-20 pb-20 px-4 sm:px-6 lg:px-8">
			<div className="max-w-7xl mx-auto text-center">
				<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 mb-8 animate-fade-in">
					<Badge className="bg-green-500 text-white text-xs animate-pulse">{t('badge_new')}</Badge>
					<span className="text-sm font-medium text-blue-700 dark:text-blue-300">
						{t('badge_powered_by')}
					</span>
				</div>

				<h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 animate-fade-in-up">
					<span className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
						{t('title_transform')}
					</span>
					<br />
					<span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
						{t('title_productivity')}
					</span>
				</h1>

				<p className="text-lg sm:text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
					{t('description')}
				</p>

				<div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in-up animation-delay-400">
					<Button
						size="lg"
						className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-lg px-8 py-4 group"
					>
						<Link className="flex justify-center items-center" href={'/sign-in'}>
							{t('cta_get_started')}
							<ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
						</Link>
					</Button>

					<Button
						variant="secondary"
						size="lg"
						className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:scale-105 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-lg px-8 py-4 group backdrop-blur-sm"
						onClick={openVideoModal}
					>
						<div className="flex justify-center items-center">
							<Play size={16} className="mr-2 group-hover:scale-110 transition-transform" />
							{t('cta_watch_demo')}
						</div>
					</Button>
				</div>

				{/* Hero Image/Dashboard Preview */}
				<div className="relative max-w-7xl mx-auto animate-fade-in-up animation-delay-600">
					<div className="bg-white/10 dark:bg-slate-900/10 backdrop-blur-lg rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-2xl p-2 hover:shadow-3xl transition-all duration-500">
						<div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl overflow-hidden">
							<Image
								src="/light-dashboard.png"
								alt={t('dashboard_alt_light')}
								className="w-full h-auto block dark:hidden transition-transform duration-500 hover:scale-105"
								width={1900}
								height={300}
							/>
							<Image
								src="/dark-dashboard.png"
								alt={t('dashboard_alt_dark')}
								className="w-full h-auto hidden dark:block transition-transform duration-500 hover:scale-105"
								width={1900}
								height={300}
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Video Modal */}
			<VideoModal isOpen={isVideoModalOpen} onClose={closeVideoModal} videoUrl={videoUrl} />
		</section>
	);
}
