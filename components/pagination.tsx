'use client';

export function Pagination({page,pageSize,total,onPageChange}:{page:number;pageSize:number;total:number;onPageChange:(page:number)=>void}){
  const pages=Math.max(1,Math.ceil(total/pageSize)),start=total?(page-1)*pageSize+1:0,end=Math.min(page*pageSize,total);
  return <nav className="pagination" aria-label="Pagination"><span>Showing {start}–{end} of {total}</span><button type="button" disabled={page<=1} onClick={()=>onPageChange(page-1)}>Previous</button><strong>Page {page} of {pages}</strong><button type="button" disabled={page>=pages} onClick={()=>onPageChange(page+1)}>Next</button></nav>;
}
