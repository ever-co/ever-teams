export type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result;
export type Nullable<T> = T | null | undefined;
