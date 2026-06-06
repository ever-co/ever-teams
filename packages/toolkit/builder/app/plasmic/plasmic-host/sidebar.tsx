import Link from 'next/link';
import { CredentialDisplay } from './credential-display';
import { CredentialForm } from './credential-form';
import { IntegrationGuide } from './integration-guide';

interface SidebarProps {
    plasmicApiKey: string;
    projectId: string;
    isEditingApiKey: boolean;
    isEditingProjectId: boolean;
    onApiKeySubmit: (value: string) => void;
    onProjectIdSubmit: (value: string) => void;
    onApiKeyReset: () => void;
    onProjectIdReset: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    plasmicApiKey,
    projectId,
    isEditingApiKey,
    isEditingProjectId,
    onApiKeySubmit,
    onProjectIdSubmit,
    onApiKeyReset,
    onProjectIdReset
}) => (
    <aside
        className="w-1/4 flex-shrink-0 fixed top-20 bottom-0 border-r border-slate-200 dark:border-slate-800 overflow-y-auto"
        role="complementary"
        aria-label="Plasmic Settings"
    >
        <div className="p-4 sm:p-6">
            <h2 id="settings-title" className="text-2xl font-bold mb-6 text-slate-900 dark:text-slate-100">
                Plasmic Settings
            </h2>

            <div className="space-y-6">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
                    {plasmicApiKey && !isEditingApiKey ? (
                        <CredentialDisplay
                            value={plasmicApiKey}
                            onReset={onApiKeyReset}
                            label="API Key"
                        />
                    ) : (
                        <CredentialForm
                            onSubmit={onApiKeySubmit}
                            label="Plasmic API Key"
                            placeholder="Enter your Plasmic API key"
                        />
                    )}
                </div>

                <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
                    {projectId && !isEditingProjectId ? (
                        <CredentialDisplay
                            value={projectId}
                            onReset={onProjectIdReset}
                            label="Project ID"
                        />
                    ) : (
                        <CredentialForm
                            onSubmit={onProjectIdSubmit}
                            label="Project ID"
                            placeholder="Enter your Project ID"
                        />
                    )}
                </div>

                <IntegrationGuide />

                <div>
                    <Link
                        href="https://docs.plasmic.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full px-4 py-2 text-sm
                       font-medium text-slate-900 dark:text-slate-100 border
                       border-slate-200 dark:border-slate-800 hover:bg-slate-100
                       dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        aria-label="Open Plasmic documentation in a new tab"
                    >
                        View Plasmic Documentation →
                    </Link>
                </div>
            </div>
        </div>
    </aside>
);
