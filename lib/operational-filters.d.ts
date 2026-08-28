import type {FollowupItem,InteractionItem,MyWorkItem} from './api-client';
export type MyWorkFilter='open'|'overdue'|'today'|'high';
export type FollowupFilter='open'|'overdue'|'today'|'upcoming';
export type InteractionFilter='all'|'today'|'calls'|'followup';
export function filterMyWork(items:MyWorkItem[],filter:MyWorkFilter,now?:Date):MyWorkItem[];
export function filterFollowups(items:FollowupItem[],filter:FollowupFilter,now?:Date):FollowupItem[];
export function filterInteractions(items:InteractionItem[],filter:InteractionFilter,search:string,now?:Date):InteractionItem[];
export function toggleFilter<T extends string>(current:T,next:T,defaultFilter:T):T;
