import type {DashboardAffiliate,DashboardStaff} from './api-client';
export type DashboardFilters={search:string;pipeline:string;staffId:string;brand:string;attention:boolean;kpi:string};
export function filterDashboardAffiliates(items:DashboardAffiliate[],filters:DashboardFilters):DashboardAffiliate[];
export function filterDashboardStaff(items:DashboardStaff[],search:string):DashboardStaff[];
