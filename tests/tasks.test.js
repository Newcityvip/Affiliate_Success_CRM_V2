const assert = require("assert"),
  fs = require("fs"),
  vm = require("vm"),
  path = require("path");
const root = path.resolve(__dirname, ".."),
  code = fs.readFileSync(path.join(root, "backend", "Tasks.gs"), "utf8"),
  compact = code.replace(/\s/g, ""),
  api = fs.readFileSync(path.join(root, "backend", "Api.gs"), "utf8"),
  admin = fs.readFileSync(path.join(root, "backend", "Admin.gs"), "utf8"),
  auth = fs.readFileSync(path.join(root, "backend", "Auth.gs"), "utf8"),
  schema = fs.readFileSync(path.join(root, "backend", "Schema.gs"), "utf8");
assert(
  api.indexOf("sessionUser_(request.token)") < api.indexOf("getTasks:function"),
  "task routes must follow live session resolution",
);
assert(auth.includes("if(!token)throw apiError_('UNAUTHENTICATED'"));
assert(auth.includes("session.Status!=='ACTIVE'"));
assert(auth.includes("staff.Status!=='ACTIVE'"));
assert(schema.includes("Tasks: ['Task_ID'"), "Tasks schema must be explicit");
assert(schema.includes("Task:'TSK'"), "Task IDs must be server generated");
assert(api.includes("getTasks:function(){return tasks_(u,p)}"));
assert(api.includes("createTask:function(){return createTask_(u,p)}"));
assert(
  /functioncreateTask_\(u,p\)\{requireRole_\(u,\["ADMIN","SUPER_ADMIN"\]\)/.test(
    compact,
  ),
);
assert(
  /functionreassignTask_\(u,p\)\{requireRole_\(u,\["ADMIN","SUPER_ADMIN"\]\)/.test(
    compact,
  ),
);
assert(
  /functioncancelTask_\(u,p\)\{requireRole_\(u,\["ADMIN","SUPER_ADMIN"\]\)/.test(
    compact,
  ),
);
assert(
  compact.includes("String(t.Staff_ID)===String(u.Staff_ID)"),
  "STAFF visibility must derive from authenticated user",
);
assert(
  compact.includes(
    "String(active.Assignment_ID)!==String(assignment.Assignment_ID)",
  ),
  "active assignment mismatch must be rejected",
);
assert(code.includes("LockService.getScriptLock()"));
assert(code.includes("Request_ID"));
assert(
  /function createStaff_\(actor,p\)\{requireRole_\(actor,\['SUPER_ADMIN'\]\)/.test(
    admin,
  ),
);
assert(
  /function resetStaffPassword_\(actor,p\)\{requireRole_\(actor,\['SUPER_ADMIN'\]\)/.test(
    admin,
  ),
);
const filter = require("../lib/task-filters");
const items = [
  {
    status: "PENDING",
    priority: "HIGH",
    overdue: true,
    dueToday: false,
    staffId: "S1",
    brandId: "B1",
    title: "Call",
    affiliateUsername: "alpha",
    affiliateName: "A",
    ownerName: "One",
    taskType: "CALL",
    description: "",
  },
  {
    status: "COMPLETED",
    priority: "NORMAL",
    overdue: false,
    dueToday: false,
    staffId: "S2",
    brandId: "B2",
    title: "Done",
    affiliateUsername: "beta",
    affiliateName: "B",
    ownerName: "Two",
    taskType: "OTHER",
    description: "",
  },
];
const base = {
  card: "open",
  search: "",
  staffId: "",
  brand: "",
  priority: "",
  status: "",
};
assert.equal(filter.filterTasks(items, base).length, 1);
assert.equal(
  filter.filterTasks(items, { ...base, card: "completed" }).length,
  1,
);
assert.equal(filter.filterTasks(items, { ...base, search: "alpha" }).length, 1);
assert.equal(filter.toggleTaskCard("overdue", "overdue"), "open");
new vm.Script(code);
console.log("tasks tests passed");
