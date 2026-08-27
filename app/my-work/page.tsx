const actions = [ // SAMPLE DATA: replace with api.getMyWorkQueue().
  { type: 'Call', affiliate: 'AFF09123', reason: 'New prospect - first attempt', due: '10:30', priority: 'High' },
  { type: 'Telegram', affiliate: 'AFF00481', reason: 'FTD down 58% - at risk', due: '11:00', priority: 'Critical' },
  { type: 'Callback', affiliate: 'AFF02114', reason: 'Requested callback', due: '11:20', priority: 'High' },
  { type: 'Telegram', affiliate: 'AFF01819', reason: 'Dormant high-value affiliate', due: '12:00', priority: 'High' },
];

export default function MyWorkPage() {
  return (
    <>
      <h1>My Work</h1>
      <p className="muted">The queue is ordered by SLA, risk and expected business value. <span className="accent">Sample preview</span></p>
      <section className="grid" style={{ marginTop: 20 }}>
        <div className="card"><div className="muted">Remaining</div><div className="kpi">17</div></div>
        <div className="card"><div className="muted">Completed</div><div className="kpi">13</div></div>
        <div className="card"><div className="muted">Overdue</div><div className="kpi">2</div></div>
        <div className="card"><div className="muted">Daily score</div><div className="kpi">84</div></div>
      </section>
      <section className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Priority queue</h2><button className="primary">Start next action</button>
        </div>
        <table className="table"><thead><tr><th>Type</th><th>Affiliate</th><th>Reason</th><th>Due</th><th>Priority</th></tr></thead>
          <tbody>{actions.map((a) => <tr key={a.affiliate}><td>{a.type}</td><td>{a.affiliate}</td><td>{a.reason}</td><td>{a.due}</td><td><span className="badge">{a.priority}</span></td></tr>)}</tbody></table>
      </section>
    </>
  );
}
