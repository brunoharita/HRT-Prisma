import { createContext, useContext, useEffect, useId, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { NavigationGuards, NavigationViewStore, safeNavigationPath } from "../shared/uxFoundation";

import { Modal } from "antd";

const guards = new NavigationGuards();
const ViewContext = createContext<NavigationViewStore | null>(null);
const LEAVE_MESSAGE = "Você tem alterações não salvas no Prisma. Deseja sair sem salvar?";

let pendingConfirmation: Promise<boolean> | null = null;
export async function confirmPrismaNavigation(): Promise<boolean> {
  if (!guards.dirty) return true;
  if (!pendingConfirmation) pendingConfirmation = new Promise<boolean>((resolve) => {
    Modal.confirm({ title: "Sair sem salvar?", content: LEAVE_MESSAGE, okText: "Sair sem salvar", cancelText: "Continuar editando", autoFocusButton: "cancel", onOk: () => resolve(true), onCancel: () => resolve(false) });
  });
  try { return await pendingConfirmation; } finally { pendingConfirmation = null; }
}

export function useUnsavedChanges(dirty: boolean): () => void {
  const id = useId();
  const current = useRef(dirty);
  current.current = dirty;
  useEffect(() => guards.register(id, () => current.current), [id]);
  return () => { current.current = false; };
}

export function PrismaViewStateProvider({ scope, children }: { scope: string; children: ReactNode }) {
  const [store] = useState(() => new NavigationViewStore(scope));
  useEffect(() => () => store.clear(), [store]);
  return <ViewContext.Provider value={store}>{children}</ViewContext.Provider>;
}

export function useViewState<T>(name: string, initial: T, page = window.location.pathname): [T, Dispatch<SetStateAction<T>>] {
  const store = useContext(ViewContext);
  const key = `${page}:${name}`;
  const [value, setValue] = useState<T>(() => store ? store.read(store.scope, key, initial) : initial);
  const current = useRef(value); current.current = value;
  const update: Dispatch<SetStateAction<T>> = (next) => {
    const resolved = typeof next === "function" ? (next as (previous: T) => T)(current.current) : next;
    current.current = resolved; store?.write(store.scope, key, resolved); setValue(resolved);
  };
  return [value, update];
}

export function usePrismaScope(): string { return useContext(ViewContext)?.scope ?? "unavailable"; }

interface HistoryEntry { index: number; path: string; }
function historyEntry(): HistoryEntry | null {
  const value = window.history.state?.prismaNavigation as HistoryEntry | undefined;
  return value && Number.isInteger(value.index) && typeof value.path === "string" ? value : null;
}

export function usePrismaNavigation(scope: string) {
  const [pathname, setPathname] = useState(() => safeNavigationPath(window.location.pathname) ?? "/not-found");
  const entry = useRef<HistoryEntry>(historyEntry() ?? { index: 0, path: pathname });
  const scrollPositions = useRef(new Map<string, number>());
  const skipPop = useRef(false);
  const pendingScroll = useRef(0);

  useEffect(() => {
    scrollPositions.current.clear();
    pendingScroll.current = 0;
  }, [scope]);

  useEffect(() => {
    // Capability URLs already carry their access token; never duplicate them in history metadata or UI caches.
    if (/^\/(verify|my-data)\//.test(window.location.pathname)) return;
    window.history.replaceState({ ...window.history.state, prismaNavigation: entry.current }, "");
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const onPop = async () => {
      if (skipPop.current) { skipPop.current = false; return; }
      const target = historyEntry() ?? { index: 0, path: window.location.pathname };
      if (!await confirmPrismaNavigation()) {
        const delta = entry.current.index - target.index;
        if (delta) { skipPop.current = true; window.history.go(delta); }
        else window.history.replaceState({ ...window.history.state, prismaNavigation: entry.current }, "", entry.current.path);
        return;
      }
      if (!/^\/(verify|my-data)\//.test(entry.current.path)) scrollPositions.current.set(entry.current.path, window.scrollY);
      entry.current = target;
      pendingScroll.current = scrollPositions.current.get(target.path) ?? 0;
      setPathname(safeNavigationPath(target.path) ?? "/not-found");
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!guards.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("beforeunload", beforeUnload);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useEffect(() => {
    if (/^\/(verify|my-data)\//.test(pathname)) return;
    let focused = false;
    const restore = () => {
      const heading = document.querySelector<HTMLElement>(".prisma-main-content h1, .prisma-auth-form-heading h2");
      if (heading && !focused) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); focused = true; }
      window.scrollTo({ top: pendingScroll.current, behavior: "instant" });
    };
    const observer = new MutationObserver(restore);
    observer.observe(document.getElementById("app")!, { childList: true, subtree: true });
    const frame = requestAnimationFrame(restore);
    // Stop restoring when the user takes over; async page content can otherwise restore the saved position.
    const stop = () => observer.disconnect();
    window.addEventListener("wheel", stop, { once: true, passive: true });
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    window.addEventListener("keydown", stop, { once: true });
    window.addEventListener("pointerdown", stop, { once: true });
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop); window.removeEventListener("pointerdown", stop);
    };
  }, [pathname, scope]);

  async function navigate(path: string, replace = false, confirmed = false): Promise<boolean> {
    const target = safeNavigationPath(path);
    if (!target || (target !== pathname && !confirmed && !await confirmPrismaNavigation())) return false;
    if (target === pathname && !replace) return true;
    if (!/^\/(verify|my-data)\//.test(pathname)) scrollPositions.current.set(pathname, window.scrollY);
    entry.current = { index: entry.current.index + (replace ? 0 : 1), path: target };
    const state = { prismaNavigation: entry.current };
    if (replace) window.history.replaceState(state, "", target);
    else window.history.pushState(state, "", target);
    pendingScroll.current = scrollPositions.current.get(target) ?? 0;
    setPathname(target);
    return true;
  }
  return { pathname, navigate };
}
