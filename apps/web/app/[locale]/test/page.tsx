'use client';
import { clsxm } from '@app/utils';
import { useIntersectionObserver } from '@uidotdev/usehooks';
import React, { useEffect, useState } from 'react';
import 'tailwindcss/tailwind.css';

export const InteractionObserverVisible = ({
	id,
	setActiveSection,
	children,
	className
}: {
	id: string;
	setActiveSection: (v: any) => void;
	children: React.ReactNode;
	className?: string;
}) => {
	const [ref, entry] = useIntersectionObserver({
		threshold: 0.9,
		root: null,
		rootMargin: '20px'
	});
	useEffect(() => {
		if (entry?.isIntersecting) {
			setActiveSection(id);
		}
	}, [entry, id, setActiveSection]);
	// const isVisible = entry.isIntersecting && entry.boundingClientRect.top < window.innerHeight * 0.2;

	return (
		<div className="relative">
			{children}
			<div id={id} ref={ref} className={clsxm('-z-50 absolute top-0 right-0 w-[1vw] h-[calc(100vh-_296px)]')}></div>
		</div>
	);
};

const Sidebar = ({ sections, activeSection, scrollToSection }) => {
	return (
		<div className="fixed top-0 left-0 h-full w-48 bg-gray-800 text-white p-4">
			<ul>
				{sections.map((section) => (
					<li
						key={section}
						className={`p-2 cursor-pointer ${activeSection === section ? 'bg-gray-600' : ''}`}
						onClick={() => scrollToSection(section)}
					>
						{`Section ${section}`}
					</li>
				))}
			</ul>
		</div>
	);
};

const App = () => {
	const [activeSection, setActiveSection] = useState(null);

	const sections = ['st-1', 'st-2', 'st-3', 'st-4', 'st-5', 'st-6', 'st-7'];

	const scrollToSection = (id) => {
		const element = document.getElementById(id);
		const offset = window.innerHeight * 0.01;
		const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
		const offsetPosition = elementPosition - offset;

		window.scrollTo({
			top: offsetPosition,
			behavior: 'smooth'
		});
	};

	return (
		<div className="flex">
			<Sidebar sections={sections} activeSection={activeSection} scrollToSection={scrollToSection} />
			<div className="ml-48 w-full">
				{/* <InteractionObserverVisible id={'st-1'} setActiveSection={setActiveSection} />
				<InteractionObserverVisible id={'st-2'} setActiveSection={setActiveSection} />
				<InteractionObserverVisible id={'st-3'} setActiveSection={setActiveSection} />
				<InteractionObserverVisible id={'st-4'} setActiveSection={setActiveSection} />
				<InteractionObserverVisible id={'st-5'} setActiveSection={setActiveSection} />
				<InteractionObserverVisible id={'st-6'} setActiveSection={setActiveSection} />
				<InteractionObserverVisible id={'st-7'} setActiveSection={setActiveSection} /> */}
			</div>
		</div>
	);
};

export default App;
