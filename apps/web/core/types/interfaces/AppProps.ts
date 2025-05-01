import { JitsuOptions } from '@jitsu/jitsu-react/dist/useJitsu';

export type MyAppProps = {
	jitsuConf?: JitsuOptions;
	jitsuHost?: string;
	envs: Record<string, string>;
	user?: any;
};
