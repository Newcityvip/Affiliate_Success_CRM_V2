type Entry={value:unknown;expiresAt:number};
const cache=new Map<string,Entry>();
const TTL_MS=30_000;
export function readCache<T>(key:string){const entry=cache.get(key);if(!entry||entry.expiresAt<=Date.now()){cache.delete(key);return null}return entry.value as T}
export function writeCache<T>(key:string,value:T){cache.set(key,{value,expiresAt:Date.now()+TTL_MS})}
export function invalidateReadCache(...prefixes:string[]){const targets=[...prefixes,'reports','team-operations'];for(const key of cache.keys())if(targets.some(prefix=>key===prefix||key.startsWith(`${prefix}:`)))cache.delete(key)}
export function clearReadCache(){cache.clear()}
