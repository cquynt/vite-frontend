// Test cho ts.yml: dòng ngay sau `ruleid:` phải bị bắt, sau `ok:` thì không.
declare const describe: any, it: any, test: any, expect: any;

// ruleid: ai-console-log-left-in
console.log("debug");
// ok: ai-console-log-left-in
console.error("loi that");

// ruleid: ai-ts-suppress-comment
// @ts-ignore
const a: number = "x";
// ok: ai-ts-suppress-comment
// @ts-expect-error vi du co ly do
const b: number = "x";

// ruleid: ai-explicit-any
const c = JSON.parse("{}") as any;
// ok: ai-explicit-any
const d = JSON.parse("{}") as unknown;

// ruleid: ai-test-focused-or-skipped
it.only("x", () => {});
// ok: ai-test-focused-or-skipped
it("x", () => {});

// ruleid: ai-fake-assertion
expect(true).toBe(true);
// ok: ai-fake-assertion
expect(1 + 1).toBe(2);

function f() {
  // ruleid: ai-empty-catch
  try { JSON.parse("{"); } catch (e) {}
  // ok: ai-empty-catch
  try { JSON.parse("{"); } catch (e) { throw e; }
}

// ruleid: ai-hardcoded-localhost
const u1 = "http://localhost:8080/api";
// ok: ai-hardcoded-localhost
const u2 = import.meta.env.VITE_API_URL;
