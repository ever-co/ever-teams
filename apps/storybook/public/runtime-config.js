// Runtime (container) configuration. Overwritten at container start from the environment by
// .deploy/examples/runtime-config.sh; empty for a plain `yarn build`, where the build-time
// import.meta.env value applies (see .storybook/preview.tsx).
self.__EVER_TEAMS_RUNTIME_ENV__ = self.__EVER_TEAMS_RUNTIME_ENV__ || {};
