import { Feature } from '../../../types';

export const BuilderFeatures = ({ features }: { features: Feature[] }) => (
    <div className="space-y-3 text-sm text-gray-600 dark:text-white/70">
        {features.map((feature, index) => (
            <div key={index} className="space-y-1">
                <div className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{feature.main}</span>
                </div>
                {feature.sub && feature.sub.length > 0 && (
                    <ul className="ml-6 space-y-1">
                        {feature.sub.map((subFeature, subIndex) => (
                            <li key={subIndex} className="flex items-start">
                                <span className="mr-2">◦</span>
                                <span>{subFeature}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        ))}
    </div>
);