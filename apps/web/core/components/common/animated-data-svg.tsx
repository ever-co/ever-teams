import { FC } from 'react';

export const AnimatedDataSvg: FC = () => {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" className="w-full h-full">
			{/* Background elements */}
			<circle cx="100" cy="100" r="85" className="fill-current opacity-5" />
			<circle
				cx="100"
				cy="100"
				r="75"
				className="fill-current opacity-5 animate-pulse"
				style={{ animationDuration: '3s' }}
			/>

			{/* Subtle grid pattern */}
			<g className="opacity-[0.07]" transform="translate(35,35)">
				{[...Array(7)].map((_, i) => (
					<g key={i}>
						<line x1={i * 20} y1="0" x2={i * 20} y2="130" className="stroke-current" strokeWidth="0.5" />
						<line x1="0" y1={i * 20} x2="130" y2={i * 20} className="stroke-current" strokeWidth="0.5" />
					</g>
				))}
			</g>

			{/* Main data visualization */}
			<g transform="translate(35,35)">
				{/* Area under the curve */}
				<path
					d="M0,90 C30,70 60,100 90,80 S120,110 130,90 L130,130 L0,130 Z"
					className="fill-current opacity-[0.08]"
				/>

				{/* Animated line chart */}
				<path
					d="M0,90 C30,70 60,100 90,80 S120,110 130,90"
					fill="none"
					className="stroke-current"
					strokeWidth="2"
					strokeLinecap="round"
					strokeDasharray="250"
					strokeDashoffset="250"
					style={{
						animation: 'dash 2s ease-out forwards'
					}}
				/>

				{/* Data points with ripple */}
				{[
					{ x: 0, y: 90 },
					{ x: 30, y: 70 },
					{ x: 60, y: 100 },
					{ x: 90, y: 80 },
					{ x: 130, y: 90 }
				].map((point, i) => (
					<g key={i} transform={`translate(${point.x},${point.y})`}>
						<circle r="2.5" className="fill-current" />
						<circle
							r="2.5"
							className="fill-current animate-ping"
							style={{ animationDuration: `${2 + i * 0.2}s` }}
						/>
					</g>
				))}

				{/* Mini bar chart */}
				<g transform="translate(20, 20)">
					{[35, 25, 40, 30].map((height, i) => (
						<rect
							key={i}
							x={i * 25}
							y={130 - height}
							width="3"
							height={height}
							rx="1"
							className="fill-current opacity-20"
							style={{
								animation: 'float 2s ease-in-out infinite',
								animationDelay: `${i * 0.2}s`
							}}
						/>
					))}
				</g>
			</g>

			{/* Decorative elements */}
			<g className="opacity-20">
				<circle
					cx="100"
					cy="100"
					r="95"
					fill="none"
					className="stroke-current"
					strokeWidth="0.5"
					strokeDasharray="3,8"
					style={{
						animation: 'spin 15s linear infinite',
						transformOrigin: 'center'
					}}
				/>
			</g>

			<style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
		</svg>
	);
};
