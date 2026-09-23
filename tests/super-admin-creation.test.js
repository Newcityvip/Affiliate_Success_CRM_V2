const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const vm = require("node:vm");

const data = {
  Staff_List: [],
  Team_List: [{ Team_ID: "T1", Team_Code: "OPS", Status: "ACTIVE", Default_Prospect_Target: 4, Default_Max_Managed_Affiliates: 12 }],
  Sessions: [],
};
let sequence = 0;
const cache = new Map();
const context = {
  console, Date, String, Number, Math, Object, Array, JSON, isFinite,
  Utilities: {
    Charset: { UTF_8: "UTF_8" }, DigestAlgorithm: { SHA_256: "SHA_256" },
    newBlob: (value) => ({ getBytes: () => Array.from(Buffer.from(String(value))) }),
    base64EncodeWebSafe: (bytes) => Buffer.from(bytes.map((b) => b & 255)).toString("base64url"),
    computeDigest: (_algorithm, value) => Array.from(crypto.createHash("sha256").update(String(value)).digest(), (b) => b > 127 ? b - 256 : b),
    computeHmacSha256Signature: (message, key) => Array.from(crypto.createHmac("sha256", Buffer.from(key)).update(Buffer.from(message)).digest(), (b) => b > 127 ? b - 256 : b),
    getUuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
  },
  CacheService: { getScriptCache: () => ({ get: (key) => cache.get(key) || null, put: (key, value) => cache.set(key, value), remove: (key) => cache.delete(key) }) },
  LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
  rows_: (name) => data[name] || [], cacheRows_: (name) => data[name] || [], clearCache_: () => {},
  findRow_: (name, column, value, exact) => (data[name] || []).find((row) => exact ? String(row[column]) === String(value) : String(row[column]).toLowerCase() === String(value).toLowerCase()) || null,
  appendRows_: (name, rows) => data[name].push(...rows.map((row) => ({ ...row }))),
  nextIdUnlocked_: () => `S${data.Staff_List.length + 1}`,
  nextId: () => `SES${data.Sessions.length + 1}`,
  now_: () => "2026-09-23T00:00:00.000Z",
  audit_: () => {},
  updateById_: (name, column, id, changes) => { const row = data[name].find((item) => String(item[column]) === String(id)); if (row) Object.assign(row, changes); return row; },
  apiError_: (code, message) => Object.assign(new Error(message), { code }),
  config_: (key) => key === "MAX_LOGIN_ATTEMPTS" ? 5 : key === "SESSION_HOURS" ? 8 : 0,
  ROLES: ["STAFF", "SUPERVISOR", "ADMIN", "SUPER_ADMIN"],
};
vm.createContext(context);
vm.runInContext(fs.readFileSync("backend/Auth.gs", "utf8"), context);
context.createPasswordHash = (password) => context.passwordHash_(password, `salt-${sequence++}`, 2);
vm.runInContext(fs.readFileSync("backend/Admin.gs", "utf8"), context);

const root = { Staff_ID: "ROOT", Role: "SUPER_ADMIN" };
const payload = (username, role) => ({ username, password: "strong-password", displayName: username, email: `${username}@example.com`, team: "T1", role, status: "ACTIVE", prospectTarget: 4, maxManagedAffiliates: 12 });
assert.equal(context.createStaff_(root, payload("newstaff", "STAFF")).role, "STAFF");
assert.equal(context.createStaff_(root, payload("newadmin", "ADMIN")).role, "ADMIN");
const created = context.createStaff_(root, payload("newroot", "SUPER_ADMIN"));
assert.equal(created.role, "SUPER_ADMIN");
assert.equal(data.Staff_List.find((row) => row.Username === "newroot").Role, "SUPER_ADMIN");
assert.ok(!JSON.stringify(created).match(/Password_Hash|salt|session|token/i));
const login = context.login_({ username: "newroot", password: "strong-password", requestId: "LOGIN-ROOT" });
assert.equal(login.user.role, "SUPER_ADMIN");
assert.ok(!JSON.stringify(login).match(/Password_Hash|salt/i));

const before = data.Staff_List.length;
for (const actor of [{ Staff_ID: "S", Role: "STAFF" }, { Staff_ID: "A", Role: "ADMIN" }]) {
  assert.throws(() => context.createStaff_(actor, payload(`blocked-${actor.Role}`, "SUPER_ADMIN")), (error) => error.code === "FORBIDDEN");
  assert.equal(data.Staff_List.length, before);
}
assert.throws(() => context.createStaff_(root, payload("newroot", "SUPER_ADMIN")), (error) => error.code === "VALIDATION_FAILED");
assert.equal(data.Staff_List.length, before);

const adminSource = fs.readFileSync("backend/Admin.gs", "utf8");
const pageSource = fs.readFileSync("app/admin/page.tsx", "utf8");
assert.match(adminSource, /function createStaff_\(actor,p\)\{requireRole_\(actor,\['SUPER_ADMIN'\]\)/);
assert.match(adminSource, /STAFF_CREATE_ROLES_=USER_ROLES\.concat\(\['SUPER_ADMIN'\]\)/);
assert.match(adminSource, /function updateStaff_[\s\S]*enum_\(p\.role\|\|current\.Role,USER_ROLES,'role'\)/);
assert.match(pageSource, /!record&&<option>SUPER_ADMIN<\/option>/);
console.log("SUPER_ADMIN account creation and server-side escalation protection tests passed");
