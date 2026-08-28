import type {AffiliateDirectoryItem} from './api-client';
export type AffiliateFilter='all'|'telegram'|'prospects'|'work';
export function filterAffiliates(items:AffiliateDirectoryItem[],filter:AffiliateFilter,search:string):AffiliateDirectoryItem[];
