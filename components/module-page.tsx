export function ModulePage({ title, description, icon }: { title: string; description: string; icon: string }) {
  return <><h1>{title}</h1><p className="muted">{description}</p><section className="card empty-state" style={{marginTop:20}}><div><div className="empty-icon">{icon}</div><h2>{title} workspace ready</h2><p className="muted">Live records will appear after the Apps Script URL and Google Sheet are configured.</p><span className="badge">NO LIVE DATA</span></div></section></>;
}
