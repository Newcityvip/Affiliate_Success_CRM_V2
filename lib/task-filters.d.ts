import type {TaskItem} from './api-client';
export type TaskCard='open'|'overdue'|'today'|'high'|'completed';
export type TaskFilters={card:TaskCard;search:string;staffId:string;brand:string;priority:string;status:string};
export function filterTasks(items:TaskItem[],filters:TaskFilters,now?:Date):TaskItem[];
export function toggleTaskCard(current:TaskCard,next:TaskCard):TaskCard;
