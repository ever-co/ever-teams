export interface SystemStatusProps {
	status: 'normal' | 'warning' | 'error';
	message: string;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ status, message }) => (
	<div className="outline-none transition duration-150 ease-in-out focus-visible:ring-2 focus-visible:ring-slate-7 group relative flex w-fit items-center gap-x-1 md:gap-x-[.625rem] overflow-hidden rounded-full border border-[#EAEAEA] dark:border-white/5 pl-1 md:pl-[.875rem] pr-2 md:pr-4 py-2 text-xs bg-white dark:bg-transparent">
		<div className="absolute inset-0 bg-white dark:bg-transparent dark:bg-gradient-to-t dark:from-white/40 dark:to-white/80 opacity-10 transition-opacity duration-300 ease-custom-ease group-hover:opacity-15"/>
		<div className="absolute inset-0 bg-white dark:bg-transparent rounded-full opacity-5 shadow-[inset_0_.0625rem_.0625rem_white] transition-opacity duration-150 ease-linear group-hover:opacity-10 "/>
		<span className="relative flex animate-pulse items-center justify-center size-3 rounded-full z-[1] bg-green-300 transition-colors ease-in-out">
			<span
				className="absolute animate-pulse-scale z-[2] size-1.5 left-[25%] top-[30%] -translate-y-1/2 -translate-x-1/2 rounded-full bg-green-500/55"
			/>
		</span>
		<span className="text-[10px] sm:text-xs text-nowrap text-primary dark:text-white">{message}</span>
	</div>
);
