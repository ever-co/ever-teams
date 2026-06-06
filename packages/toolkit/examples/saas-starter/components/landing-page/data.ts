import {
	Timer,
	Brain,
	Users,
	BarChart3,
	Activity,
	Shield
} from 'lucide-react';

export const features = [
	{
		icon: Timer,
		title: 'Smart Time Tracking',
		description:
			'Powered by Teams SDK, our platform provides intelligent time tracking with automatic categorization and real-time sync.',
		gradient: 'from-blue-500 to-cyan-500'
	},
	{
		icon: Brain,
		title: 'AI-Powered Insights',
		description:
			'Transform tracked time into actionable insights with AI-powered analytics and productivity recommendations.',
		gradient: 'from-purple-500 to-pink-500'
	},
	{
		icon: Users,
		title: 'Team Management',
		description:
			'Comprehensive tools for managing teams, tracking performance, and optimizing workforce productivity.',
		gradient: 'from-emerald-500 to-teal-500'
	},
	{
		icon: BarChart3,
		title: 'Advanced Reports',
		description:
			'Detailed analytics and custom reports to help you make data-driven decisions about your team and projects.',
		gradient: 'from-orange-500 to-red-500'
	}
];

export const testimonials = [
	{
		name: 'Sarah Chen',
		role: 'Operations Manager at TechFlow',
		content:
			'This platform revolutionized how we manage our remote teams. The time tracking and reporting features are exceptional.',
		avatar: '/placeholder.svg?height=40&width=40',
		rating: 5
	},
	{
		name: 'Marcus Rodriguez',
		role: 'Tech Lead at DevCorp',
		content:
			'The AI insights have helped us identify bottlenecks and improve team productivity by 35%. A game-changer for our workflow.',
		avatar: '/placeholder.svg?height=40&width=40',
		rating: 5
	},
	{
		name: 'Emily Watson',
		role: 'Product Owner at Agile Inc',
		content:
			'Finally, a platform that combines powerful time tracking with meaningful analytics. Perfect for agile teams!',
		avatar: '/placeholder.svg?height=40&width=40',
		rating: 5
	}
];

export const pricingPlans = [
	{
		name: 'Starter',
		price: 29,
		description: 'For small teams',
		features: ['Up to 10 team members', 'Basic time tracking', 'Team dashboard', 'Standard reports'],
		popular: false
	},
	{
		name: 'Professional',
		price: 79,
		description: 'For growing teams',
		features: [
			'Up to 50 team members',
			'Advanced time tracking',
			'AI-powered insights',
			'Custom reports',
			'Priority support'
		],
		popular: true
	},
	{
		name: 'Enterprise',
		price: 'Custom',
		description: 'For large organizations',
		features: [
			'Unlimited team members',
			'Advanced security',
			'Custom integration',
			'24/7 support',
			'Dedicated account manager'
		],
		popular: false
	}
];

export const faqs = [
	{
		question: 'How easy is it to integrate Teams?',
		answer: 'Teams is designed for developers with simple embeddable components. Integration takes minutes with our SDK and comprehensive documentation.'
	},
	{
		question: 'Does Teams work offline?',
		answer: 'Yes, Teams features seamless offline tracking. All data is synchronized automatically when connection is restored, ensuring no time is lost.'
	},
	{
		question: 'How does AI improve productivity?',
		answer: 'Our AI analyzes work patterns, automatically categorizes tasks, and provides insights for productivity optimization while maintaining privacy and security.'
	},
	{
		question: 'What kind of reports are available?',
		answer: 'Teams offers comprehensive real-time reporting including productivity analytics, time distribution, resource utilization, and custom report generation.'
	}
];

export const additionalFeatures = [
	{
		icon: Timer,
		title: 'Automatic Tracking',
		description: 'Smart time tracking with project detection and categorization.',
		gradient: 'from-blue-500 to-cyan-500'
	},
	{
		icon: Activity,
		title: 'Activity Monitoring',
		description: 'Track productivity levels and work patterns in real-time.',
		gradient: 'from-green-500 to-emerald-500'
	},
	{
		icon: Brain,
		title: 'AI Insights',
		description: 'Get intelligent recommendations to improve team productivity.',
		gradient: 'from-purple-500 to-pink-500'
	},
	{
		icon: Users,
		title: 'Team Dashboard',
		description: 'Comprehensive overview of team performance and activities.',
		gradient: 'from-orange-500 to-red-500'
	},
	{
		icon: BarChart3,
		title: 'Advanced Reports',
		description: 'Detailed analytics and customizable reporting tools.',
		gradient: 'from-indigo-500 to-blue-500'
	},
	{
		icon: Shield,
		title: 'Enterprise Security',
		description: 'Advanced security features with role-based access control.',
		gradient: 'from-teal-500 to-cyan-500'
	}
];
