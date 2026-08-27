export default function ImportPage() {
  return (
    <>
      <h1>Bulk Affiliate Import & Assignment</h1>
      <p className="muted">Upload or paste Affiliate Username, Email and Phone. Validate before committing.</p>
      <section className="card" style={{ marginTop: 20 }}>
        <h2>Import configuration</h2>
        <p><strong>Brand:</strong> selectable by admin</p>
        <p><strong>Assign to:</strong> staff member or unassigned pool</p>
        <p><strong>Import mode:</strong> New prospects / Update contact details / Reopen closed</p>
        <p><strong>Validation:</strong> duplicate username, duplicate phone/email, prior closure, invalid contact shape, existing assignment.</p>
      </section>
    </>
  );
}
