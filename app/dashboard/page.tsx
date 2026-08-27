const team = [ // SAMPLE DATA: replace with a future Command Center API response.
  { name: 'Staff A', work: 22, done: 16, overdue: 1, score: 88 },
  { name: 'Staff B', work: 24, done: 9, overdue: 7, score: 51 },
  { name: 'Staff C', work: 19, done: 17, overdue: 0, score: 94 },
];

export default function DashboardPage() {
  return (
    <>
      <h1>Command Center</h1>
      <p className="muted">Today’s execution, workload and affiliate outcomes. <span className="accent">Sample preview</span></p>
      <section className="grid" style={{ marginTop: 20 }}>
        <div className="card"><div className="card-label">Open actions <span>◫</span></div><div className="kpi">65 <small>+8%</small></div></div>
        <div className="card"><div className="card-label">Overdue <span>!</span></div><div className="kpi">8</div><div className="progress"><i style={{width:'28%'}}/></div></div>
        <div className="card"><div className="card-label">Telegram connected <span>↗</span></div><div className="kpi">14 <small>today</small></div></div>
        <div className="card"><div className="card-label">Reactivated <span>✦</span></div><div className="kpi">27 <small>this week</small></div></div>
      </section>
      <section className="card" style={{ marginTop: 20 }}>
        <div className="section-head"><h2>Team execution</h2><span className="muted">Sample team · today</span></div>
        <table className="table">
          <thead><tr><th>Staff</th><th>Work</th><th>Done</th><th>Overdue</th><th>Score</th></tr></thead>
          <tbody>{team.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.work}</td><td>{r.done}</td><td>{r.overdue}</td><td><span className={r.score > 80 ? 'badge good':'badge critical'}>{r.score}</span></td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
