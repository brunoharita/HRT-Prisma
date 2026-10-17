/** The server remains authoritative; this keeps an already-open UI aware of revocation. */
export function startSessionRevalidation(refresh: () => Promise<unknown>, browser: Pick<Window, "addEventListener" | "removeEventListener" | "setInterval" | "clearInterval"> = window, page: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener"> = document): () => void {
  let stopped = false, running = false;
  const check = () => {
    if (stopped || running || page.visibilityState !== "visible") return;
    running = true;
    void refresh().catch(() => undefined).finally(() => { running = false; });
  };
  browser.addEventListener("focus", check);
  page.addEventListener("visibilitychange", check);
  const timer = browser.setInterval(check, 30_000);
  return () => { stopped = true;browser.clearInterval(timer);browser.removeEventListener("focus", check);page.removeEventListener("visibilitychange", check); };
}
export function operatorAccessDisabled(operator: {status: string; mustChangePassword: boolean} | null): boolean {
  return Boolean(operator && operator.status !== "active" && !(operator.status === "pending_first_access" && operator.mustChangePassword));
}
