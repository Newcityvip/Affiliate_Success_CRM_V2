const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const vm = require("node:vm");

function context(native) {
  let nativeCalls = 0;
  const utilities = {
    Charset: { UTF_8: "UTF_8" },
    DigestAlgorithm: { SHA_256: "SHA_256" },
    newBlob: (value) => ({ getBytes: () => Array.from(Buffer.from(String(value))) }),
    base64EncodeWebSafe: (bytes) => Buffer.from(bytes.map((b) => b & 255)).toString("base64url"),
    computeDigest: (_algorithm, value) => Array.from(crypto.createHash("sha256").update(String(value)).digest(), (b) => b > 127 ? b - 256 : b),
    getUuid: () => "11111111-2222-4333-8444-555555555555",
  };
  if (native) {
    utilities.computeHmacSha256Signature = (message, key) => {
      nativeCalls++;
      return Array.from(crypto.createHmac("sha256", Buffer.from(key)).update(Buffer.from(message)).digest(), (b) => b > 127 ? b - 256 : b);
    };
  }
  const sandbox = { console, Date, String, Number, Math, Utilities: utilities };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync("backend/Auth.gs", "utf8"), sandbox);
  return { sandbox, nativeCalls: () => nativeCalls };
}

const native = context(true);
assert.equal(native.sandbox.pbkdf2_("password", "salt", 1), "Eg-2z_z4syxD5yJSVsT4N6hlSMkszDVICAWYfLcL4Xs");
assert.equal(native.sandbox.pbkdf2_("password", "salt", 2), "rk0Mla9rRtMtCt_5KPBt0CowP47zwlHf1uLYWpVHTEM");
assert.equal(native.nativeCalls(), 3);
const fallback = context(false);
assert.equal(fallback.sandbox.pbkdf2_("password", "salt", 2), native.sandbox.pbkdf2_("password", "salt", 2));
assert.equal(fallback.sandbox.pbkdf2_("pässword", "sālt", 2), native.sandbox.pbkdf2_("pässword", "sālt", 2));
assert.match(fs.readFileSync("backend/Auth.gs", "utf8"), /Utilities\.computeHmacSha256Signature/);
const sessions = [], cache = new Map(), staff = { Staff_ID: "S1", Username: "staff", Display_Name: "Staff", Email: "staff@example.com", Role: "STAFF", Team: "T1", Status: "ACTIVE" };
staff.Password_Hash = native.sandbox.passwordHash_("correct-password", "fixed-salt", 2);
Object.assign(native.sandbox, {
  ROLES: ["STAFF"],
  config_: (key) => key === "MAX_LOGIN_ATTEMPTS" ? 5 : key === "SESSION_HOURS" ? 8 : 0,
  CacheService: { getScriptCache: () => ({ get: (key) => cache.get(key) || null, put: (key, value) => cache.set(key, value), remove: (key) => cache.delete(key) }) },
  findRow_: (name, column, value) => name === "Staff_List" ? (String(value) === "staff" || String(value) === "S1" ? staff : null) : sessions.find((row) => String(row[column]) === String(value)) || null,
  nextId: () => "SES000001",
  now_: () => new Date().toISOString(),
  appendRows_: (name, rows) => { if (name === "Sessions") sessions.push(...rows); },
  audit_: () => {},
  updateById_: () => {},
  apiError_: (code, message) => Object.assign(new Error(message), { code }),
});
const loggedIn = native.sandbox.login_({ username: "STAFF", password: "correct-password", requestId: "AUTH-1" });
assert.equal(loggedIn.user.staffId, "S1");
assert.equal(native.sandbox.sessionUser_(loggedIn.token).staff.Staff_ID, "S1");
assert.throws(() => native.sandbox.login_({ username: "staff", password: "wrong-password", requestId: "AUTH-2" }), (error) => error.code === "INVALID_CREDENTIALS");
console.log("Authentication PBKDF2 compatibility and native HMAC acceleration tests passed");
