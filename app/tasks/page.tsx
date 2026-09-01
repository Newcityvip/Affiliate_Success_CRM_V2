"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  AffiliateLookupItem,
  TaskItem,
  TasksResponse,
} from "../../lib/api-client";
import { clearReadCache, readCache, writeCache } from "../../lib/read-cache";
import { TaskCard, TaskFilters, toggleTaskCard } from "../../lib/task-filters";
import { AffiliateLookup } from "../../components/affiliate-lookup";
import { Pagination } from "../../components/pagination";
import styles from "./tasks.module.css";
const EMPTY: TaskFilters = {
  card: "open",
  search: "",
  staffId: "",
  brand: "",
  priority: "",
  status: "",
};
export default function TasksPage() {
  const [data, setData] = useState<TasksResponse | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [filters, setFilters] = useState<TaskFilters>(EMPTY),
    [creating, setCreating] = useState(false),
    [page, setPage] = useState(1);
  const change = (next: TaskFilters) => {
    setPage(1);
    setFilters(next);
  };
  const load = useCallback(async () => {
    const key = `tasks:${page}:${JSON.stringify(filters)}`,
      cached = readCache<TasksResponse>(key);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else setLoading(true);
    setError("");
    try {
      const r = await api.getTasks(page, 50, filters);
      if (page > 1 && !r.items.length && r.total > 0) {
        setPage(Math.max(1, Math.ceil(r.total / r.pageSize)));
        return;
      }
      setData(r);
      writeCache(key, r);
    } catch (c) {
      const auth =
        c instanceof ApiError &&
        ["UNAUTHENTICATED", "SESSION_EXPIRED", "FORBIDDEN"].includes(c.code);
      if (!cached || auth) {
        if (auth) {
          clearReadCache();
          setData(null);
        }
        setError(
          c instanceof ApiError ? c.message : "Tasks could not be loaded.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [page, filters]);
  useEffect(() => {
    const timer = window.setTimeout(
      () => void load(),
      filters.search ? 250 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [load, filters.search]);
  const items = data?.items || [],
    cards: Array<[string, number, TaskCard]> = data
      ? [
          ["Open Tasks", data.summary.open, "open"],
          ["Overdue", data.summary.overdue, "overdue"],
          ["Due Today", data.summary.dueToday, "today"],
          ["High Priority", data.summary.high, "high"],
          ["Completed", data.summary.completed, "completed"],
        ]
      : [];
  const changed = async () => {
    setSuccess("Task updated successfully.");
    await load();
  };
  return (
    <>
      <div className="section-head">
        <div>
          <h1>Tasks</h1>
          <p className="muted">
            Manual operational assignments, separate from system-generated My
            Work.
          </p>
        </div>
        <div className={styles.head}>
          {data?.canManage && (
            <button className="primary" onClick={() => setCreating((v) => !v)}>
              + Create Task
            </button>
          )}
          <button onClick={() => void load()}>Refresh</button>
        </div>
      </div>
      {success && <p className="success-message">{success}</p>}
      {creating && data && (
        <CreateTask
          data={data}
          onDone={async () => {
            setCreating(false);
            setSuccess("Task created successfully.");
            await load();
          }}
          onCancel={() => setCreating(false)}
        />
      )}{" "}
      {data && (
        <>
          <div className={styles.summary}>
            {cards.map(([label, n, key]) => (
              <button
                className={`card ${styles.summaryButton} ${filters.card === key ? styles.active : ""}`}
                aria-pressed={filters.card === key}
                key={key}
                onClick={() =>
                  change({
                    ...filters,
                    card: toggleTaskCard(filters.card, key),
                  })
                }
              >
                <span>{label}</span>
                <b>{n}</b>
              </button>
            ))}
          </div>
          <Filters data={data} value={filters} onChange={change} />
        </>
      )}
      {loading && !data ? (
        <State
          title="Loading tasks…"
          detail="Retrieving the authorized task workspace."
        />
      ) : error ? (
        <State
          title="Unable to load Tasks"
          detail={error}
          action={
            <button className="primary" onClick={() => void load()}>
              Retry
            </button>
          }
        />
      ) : data && data.summary.open + data.summary.completed === 0 ? (
        <State
          title="No tasks yet"
          detail="No task history exists in your authorized scope."
        />
      ) : !items.length ? (
        <State
          title="No matching tasks"
          detail={`${data?.summary.completed || 0} completed task${data?.summary.completed === 1 ? " exists" : "s exist"} in your authorized scope.`}
          action={<button onClick={() => change(EMPTY)}>Clear filters</button>}
        />
      ) : (
        <>
          <TaskList items={items} data={data!} onChanged={changed} />
          <Pagination
            page={data!.page}
            pageSize={data!.pageSize}
            total={data!.total}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
}
function Filters({
  data,
  value,
  onChange,
}: {
  data: TasksResponse;
  value: TaskFilters;
  onChange: (v: TaskFilters) => void;
}) {
  const brands = data.options.brands || [];
  return (
    <div className={styles.filters}>
      <input
        value={value.search}
        onChange={(e) => onChange({ ...value, search: e.target.value })}
        placeholder="Search task, affiliate, owner or notes"
      />
      {data.canManage && (
        <select
          value={value.staffId}
          onChange={(e) => onChange({ ...value, staffId: e.target.value })}
        >
          <option value="">All staff</option>
          {data.options.staff.map((s) => (
            <option value={s.staffId} key={s.staffId}>
              {s.displayName}
            </option>
          ))}
        </select>
      )}
      <select
        value={value.brand}
        onChange={(e) => onChange({ ...value, brand: e.target.value })}
      >
        <option value="">All brands</option>
          {brands.map((brand) => (
            <option value={brand.brandId} key={brand.brandId}>
              {brand.brandName}
          </option>
        ))}
      </select>
      <select
        value={value.priority}
        onChange={(e) => onChange({ ...value, priority: e.target.value })}
      >
        <option value="">All priorities</option>
        <option>HIGH</option>
        <option>NORMAL</option>
        <option>LOW</option>
      </select>
      <select
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value })}
      >
        <option value="">All statuses</option>
        <option>PENDING</option>
        <option>IN_PROGRESS</option>
        <option>COMPLETED</option>
        <option>CANCELLED</option>
      </select>
      <button onClick={() => onChange(EMPTY)}>Clear</button>
    </div>
  );
}
function TaskList({
  items,
  data,
  onChanged,
}: {
  items: TaskItem[];
  data: TasksResponse;
  onChanged: () => Promise<void>;
}) {
  return (
    <section className="card">
      <div className="section-head">
        <div>
          <h2>Task schedule</h2>
          <p className="muted">
            {items.length} record{items.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className="table">
          <thead>
            <tr>
              <th>Affiliate</th>
              <th>Task</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due</th>
              <th>Owner</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr className={x.overdue ? styles.overdue : ""} key={x.taskId}>
                <td>
                  <strong>{x.affiliateUsername || "General task"}</strong>
                  <small>
                    {x.affiliateName || x.brandName || "Not affiliate-linked"}
                  </small>
                  {x.affiliateUsername && <Copy value={x.affiliateUsername} />}
                </td>
                <td>
                  <strong>{x.title}</strong>
                  <small>
                    {label_(x.taskType)} · {x.description || x.taskId}
                  </small>
                </td>
                <td>{label_(x.priority)}</td>
                <td>
                  <Badge item={x} />
                </td>
                <td>{date_(x.dueAt)}</td>
                <td>{x.ownerName}</td>
                <td>
                  <Actions item={x} data={data} onChanged={onChanged} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={styles.mobile}>
        {items.map((x) => (
          <article key={x.taskId}>
            <strong>{x.title}</strong>
            <span>
              {x.affiliateUsername || "General task"} · {x.ownerName}
            </span>
            <p>
              {label_(x.taskType)} · {label_(x.priority)} · {date_(x.dueAt)}
            </p>
            <Badge item={x} />
            <Actions item={x} data={data} onChanged={onChanged} />
          </article>
        ))}
      </div>
    </section>
  );
}
function Actions({
  item,
  data,
  onChanged,
}: {
  item: TaskItem;
  data: TasksResponse;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [note, setNote] = useState(""),
    [owner, setOwner] = useState(item.staffId),
    open = ["PENDING", "IN_PROGRESS"].includes(item.status);
  async function act(run: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await run();
      await onChanged();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Task update failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.actions}>
      {error && <small className="error-message">{error}</small>}
      {item.affiliateId && (
        <Link
          href={`/affiliates?affiliateId=${encodeURIComponent(item.affiliateId)}`}
        >
          View Affiliate
        </Link>
      )}
      {item.status === "PENDING" && (
        <button
          disabled={busy}
          onClick={() => void act(() => api.startTask(item.taskId))}
        >
          {busy ? "Starting…" : "Start"}
        </button>
      )}
      {open && (
        <>
          <input
            aria-label="Completion note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Completion note"
          />
          <button
            disabled={busy}
            onClick={() => void act(() => api.completeTask(item.taskId, note))}
          >
            {busy ? "Completing…" : "Complete"}
          </button>
        </>
      )}
      {data.canManage && open && (
        <>
          <select value={owner} onChange={(e) => setOwner(e.target.value)}>
            {data.options.staff.map((s) => (
              <option key={s.staffId} value={s.staffId}>
                {s.displayName}
              </option>
            ))}
          </select>
          {owner !== item.staffId && (
            <button
              disabled={busy}
              onClick={() =>
                void act(() => api.reassignTask(item.taskId, owner))
              }
            >
              {busy ? "Reassigning…" : "Reassign"}
            </button>
          )}
          <button
            disabled={busy}
            onClick={() => {
              if (window.confirm("Cancel this task? This ends the task."))
                void act(() => api.cancelTask(item.taskId));
            }}
          >
            {busy ? "Cancelling…" : "Cancel"}
          </button>
        </>
      )}
    </div>
  );
}
function CreateTask({
  data,
  onDone,
  onCancel,
}: {
  data: TasksResponse;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [staffId, setStaffId] = useState(data.options.staff[0]?.staffId || ""),
    [selected, setSelected] = useState<AffiliateLookupItem | null>(null),
    [taskType, setTaskType] = useState("FOLLOW_UP"),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [priority, setPriority] = useState("NORMAL"),
    [dueAt, setDueAt] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.createTask({
        staffId,
        affiliateId: selected?.affiliateId || "",
        taskType,
        title,
        description,
        priority,
        dueAt: dueAt ? new Date(dueAt).toISOString() : "",
        clientRequestId: crypto.randomUUID(),
      });
      await onDone();
    } catch (c) {
      setError(
        c instanceof ApiError ? c.message : "Task could not be created.",
      );
      setBusy(false);
    }
  }
  return (
    <form className={`card ${styles.create}`} onSubmit={submit}>
      <div className="section-head">
        <div>
          <h2>Create operational task</h2>
          <p className="muted">
            Affiliate-linked tasks must follow the current active assignment.
          </p>
        </div>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className={styles.formGrid}>
        <label>
          Assigned Staff *
          <select
            required
            value={staffId}
            onChange={(e) => {
              setStaffId(e.target.value);
              setSelected(null);
            }}
          >
            {data.options.staff.map((s) => (
              <option value={s.staffId} key={s.staffId}>
                {s.displayName}
              </option>
            ))}
          </select>
        </label>
        <AffiliateLookup staffId={staffId} onSelect={setSelected} />
        <label>
          Task Type *
          <input
            required
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
          />
        </label>
        <label>
          Title *
          <input
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Priority
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option>HIGH</option>
            <option>NORMAL</option>
            <option>LOW</option>
          </select>
        </label>
        <label>
          Due date/time
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </label>
        <label className={styles.wide}>
          Instructions / Notes
          <textarea
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>
      <button className="primary" disabled={busy || !staffId}>
        {busy ? "Creating…" : "Create Task"}
      </button>
    </form>
  );
}
function Copy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={styles.copy}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? "Copied" : "Copy Username"}
    </button>
  );
}
function Badge({ item }: { item: TaskItem }) {
  return (
    <span className={`${styles.badge} ${item.overdue ? styles.urgent : ""}`}>
      {label_(item.overdue ? "OVERDUE" : item.status)}
    </span>
  );
}
function State({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="card empty-state">
      <div>
        <div className="empty-icon">□</div>
        <h2>{title}</h2>
        <p className="muted">{detail}</p>
        {action}
      </div>
    </section>
  );
}
function label_(v: string) {
  return String(v || "—")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function date_(v: string) {
  if (!v) return "No due date";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
}
