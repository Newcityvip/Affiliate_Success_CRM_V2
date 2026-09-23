import type {AffiliateDirectoryItem} from './api-client';
export type AffiliateFilter='all'|'telegram'|'telegram-not-connected'|'prospects'|'work';
export function filterAffiliates(items:AffiliateDirectoryItem[],filter:AffiliateFilter,search:string):AffiliateDirectoryItem[];
