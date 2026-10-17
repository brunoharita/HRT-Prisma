import assert from "node:assert/strict";
import test from "node:test";
import {operatorAccessDisabled, startSessionRevalidation} from "../web/src/shared/sessionRevalidation.js";

test("inactive and blocked sessions cannot escape through pending password change", () => {
  for (const status of ["inactive", "blocked", "unknown"]) for (const mustChangePassword of [false, true]) assert.equal(operatorAccessDisabled({status, mustChangePassword}), true);
  assert.equal(operatorAccessDisabled({status:"active", mustChangePassword:true}), false);
  assert.equal(operatorAccessDisabled({status:"pending_first_access", mustChangePassword:true}), false);
  assert.equal(operatorAccessDisabled({status:"pending_first_access", mustChangePassword:false}), true);
});
test("visible session revalidation handles focus, interval, deduplication, failure and cleanup", async () => {
  const events = new Map<string, () => void>();let interval: (() => void) | null = null, calls = 0, milliseconds = 0, released = () => {};
  const browser = {addEventListener:(name:string, fn:() => void)=>events.set(name,fn),removeEventListener:(name:string)=>events.delete(name),setInterval:(fn:() => void,ms:number)=>{interval=fn;milliseconds=ms;return 1;},clearInterval:()=>{interval=null;}};
  const page = {visibilityState:"visible" as DocumentVisibilityState,addEventListener:browser.addEventListener,removeEventListener:browser.removeEventListener};
  const stop = startSessionRevalidation(() => {calls++;return new Promise<void>(resolve=>{released=resolve;});},browser as unknown as Window,page as unknown as Document);
  assert.equal(milliseconds,30_000);
  events.get("focus")!();events.get("focus")!();assert.equal(calls,1);
  released();await new Promise(resolve=>setTimeout(resolve,0));
  page.visibilityState="hidden";events.get("visibilitychange")!();(interval as unknown as () => void)();assert.equal(calls,1);
  page.visibilityState="visible";events.get("visibilitychange")!();assert.equal(calls,2);
  released();await new Promise(resolve=>setTimeout(resolve,0));
  (interval as unknown as () => void)();assert.equal(calls,3);
  stop();assert.equal(events.size,0);assert.equal(interval,null);released();
  const stopFailure = startSessionRevalidation(async () => {calls++;throw Error("synthetic transport failure");},browser as unknown as Window,page as unknown as Document);
  events.get("focus")!();await new Promise(resolve=>setTimeout(resolve,0));events.get("focus")!();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,5);stopFailure();
});
