const team = [
  { name: 'Staff A', work: 22, done: 16, overdue: 1, score: 88 },
  { name: 'Staff B', work: 24, done: 9, overdue: 7, score: 51 },
  { name: 'Staff C', work: 19, done: 17, overdue: 0, score: 94 },
];

export default function DashboardPage() {
  return (
    <>
      <h1>Command Center</h1>
      <p className="muted">Live execution, workload and affiliate outcome overview.</p>
      <section className="grid" style={{ marginTop: 20 }}>
        <div className="card"><div className="muted">Open actions</div><div className="kpi">65</div></div>
        <div className="card"><div className="muted">Overdue</div><div className="kpi">8</div></div>
        <div className="card"><div className="muted">Telegram connected today</div><div className="kpi">14</div></div>
        <div className="card"><div className="muted">Reactivated this week</div><div className="kpi">27</div></div>
      </section>
      <section className="card" style={{ marginTop: 20 }}>
        <h2>Team execution</h2>
        <table className="table">
          <thead><tr><th>Staff</th><th>Work</th><th>Done</th><th>Overdue</th><th>Score</th></tr></thead>
          <tbody>{team.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.work}</td><td>{r.done}</td><td>{r.overdue}</td><td>{r.score}</td></tr>)}</tbody>
        </table>
      </section>
    </>
  );
}
