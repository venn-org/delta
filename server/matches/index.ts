import "server-only";

/** Public interface of the matches domain. */
export { getMatchList, hasUnlockedAll } from "./list";
export { getMatchDetail, sayHi } from "./detail";
export type { MatchDetailResult, SayHiResult } from "./detail";
