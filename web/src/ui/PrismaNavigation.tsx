import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { NavigationGuards, NavigationViewStore, safeNavigationPath } from "../shared/uxFoundation";
import { nextNavigationEntry, operatorHistoryPath, previousNavigationPath, readNavigationHistory, type NavigationHistoryEntry } from "../shared/navigationHistory";

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

interface BackNavigation {
  canGoBack: boolean;
  goingBack: boolean;
  goBack: () => Promise<boolean>;
}
interface BackContextValue extends BackNavigation { register: (id: string, back: () => void) => () => void; }
const BackContext = createContext<BackContextValue | null>(null);

export function PrismaBackProvider({ value, children }: { value: BackNavigation; children: ReactNode }) {
  const [targets, setTargets] = useState<Map<string, () => void>>(() => new Map());
  const localPending = useRef(false);
  const [localGoingBack, setLocalGoingBack] = useState(false);
  const register = useCallback((id: string, back: () => void) => {
    setTargets(current => new Map(current).set(id, back));
    return () => setTargets(current => { const next = new Map(current); next.delete(id); return next; });
  }, []);
  const target = [...targets.values()].at(-1);
  async function goBack() {
    if (!target) return value.goBack();
    if (localPending.current) return false;
    localPending.current = true; setLocalGoingBack(true);
    try { if (!await confirmPrismaNavigation()) return false; target(); return true; }
    finally { localPending.current = false; setLocalGoingBack(false); }
  }
  return <BackContext.Provider value={{ ...value, goingBack: localGoingBack || value.goingBack, canGoBack: Boolean(target) || value.canGoBack, goBack, register }}>{children}</BackContext.Provider>;
}

export function usePrismaBack() { return useContext(BackContext); }

/** Explicit internal screens use the same arrow; callbacks never carry domain data. */
export function usePrismaScreenBack(available: boolean, back: () => void) {
  const register = useContext(BackContext)?.register;
  const id = useId(); const current = useRef(back); current.current = back;
  useEffect(() => available && register ? register(id, () => current.current()) : undefined, [available, register, id]);
}

export function usePrismaScreenState<T>(initial: T, active = true): [T, Dispatch<SetStateAction<T>>, (value: T, resetHistory?: boolean) => void] {
  const [state, setState] = useState({ value: initial, previous: [] as T[] });
  const current = useRef(state); current.current = state;
  const update = useCallback<Dispatch<SetStateAction<T>>>(next => {
    const before = current.current;
    const value = typeof next === "function" ? (next as (previous: T) => T)(before.value) : next;
    if (Object.is(value, before.value)) return;
    const after = { value, previous: [...before.previous.slice(-49), before.value] };
    current.current = after; setState(after);
  }, []);
  usePrismaScreenBack(active && state.previous.length > 0, () => {
    const before = current.current;
    const after = { value: before.previous.at(-1)!, previous: before.previous.slice(0, -1) };
    current.current = after; setState(after);
  });
  const replace = useCallback((value: T, resetHistory = false) => { const after = { value, previous: resetHistory ? [] : current.current.previous }; current.current = after; setState(after); }, []);
  return [state.value, update, replace];
}

export function usePrismaViewScreenState<T>(name: string, initial: T, page = window.location.pathname, active = true): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useViewState(name, initial, page);
  const [previous, setPrevious] = useState<T[]>([]);
  const current = useRef(value); current.current = value;
  usePrismaScreenBack(active && previous.length > 0, () => { setValue(previous.at(-1)!); setPrevious(previous.slice(0, -1)); });
  const update: Dispatch<SetStateAction<T>> = next => {
    const resolved = typeof next === "function" ? (next as (value: T) => T)(current.current) : next;
    if (Object.is(resolved, current.current)) return;
    const origin = current.current;
    setPrevious(prior => [...prior.slice(-49), origin]); setValue(resolved);
  };
  return [value, update];
}

export function usePrismaNavigation(scope: string) {
  const [pathname, setPathname] = useState(() => safeNavigationPath(window.location.pathname) ?? "/not-found");
  // Auth is restored asynchronously. Keep metadata inert until its exact scope is confirmed.
  const remembered = window.history.state?.prismaNavigation;
  const rememberedScope = typeof remembered?.scope === "string" ? remembered.scope : scope;
  const entry = useRef<NavigationHistoryEntry>(readNavigationHistory(remembered, rememberedScope, pathname) ?? { index: 0, path: pathname, scope });
  const scrollPositions = useRef(new Map<string, number>());
  const skipPop = useRef(false);
  const pendingScroll = useRef(0);
  const approvedBack = useRef<string | null>(null);
  const backPending = useRef(false);
  const [goingBack, setGoingBack] = useState(false);
  const [, refreshHistory] = useState(0);
  const currentScope = useRef(scope); currentScope.current = scope;

  useEffect(() => {
    scrollPositions.current.clear();
    pendingScroll.current = 0;
    if (scope.startsWith("no-session:")) return;
    if (entry.current.scope !== scope) {
      entry.current = { index: 0, path: window.location.pathname, scope };
      if (operatorHistoryPath(entry.current.path)) window.history.replaceState({ prismaNavigation: entry.current }, "");
      else window.history.replaceState(null, "");
      approvedBack.current = null; backPending.current = false; setGoingBack(false); refreshHistory(n => n + 1);
    }
  }, [scope]);

  useEffect(() => {
    // Capability URLs already carry their access token; never duplicate them in history metadata or UI caches.
    if (/^\/(assessment|verify|my-data)(\/|$)/.test(window.location.pathname)) { window.history.replaceState(null, ""); return; }
    if (!operatorHistoryPath(window.location.pathname)) window.history.replaceState(null, "");
    else if (!currentScope.current.startsWith("no-session:")) window.history.replaceState({ ...window.history.state, prismaNavigation: entry.current }, "");
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const onPop = async () => {
      if (skipPop.current) { skipPop.current = false; return; }
      const target = readNavigationHistory(window.history.state?.prismaNavigation, currentScope.current, window.location.pathname)
        ?? { index: 0, path: window.location.pathname, scope: currentScope.current };
      const preapproved = approvedBack.current === target.path;
      approvedBack.current = null;
      if (!preapproved && !await confirmPrismaNavigation()) {
        const delta = entry.current.index - target.index;
        if (delta) { skipPop.current = true; window.history.go(delta); }
        else window.history.replaceState({ ...window.history.state, prismaNavigation: entry.current }, "", entry.current.path);
        backPending.current = false; setGoingBack(false); return;
      }
      if (operatorHistoryPath(entry.current.path)) scrollPositions.current.set(entry.current.path, window.scrollY);
      entry.current = target;
      if (!operatorHistoryPath(target.path)) window.history.replaceState(null, "");
      else window.history.replaceState({ prismaNavigation: target }, "");
      pendingScroll.current = scrollPositions.current.get(target.path) ?? 0;
      setPathname(safeNavigationPath(target.path) ?? "/not-found");
      backPending.current = false; setGoingBack(false); refreshHistory(n => n + 1);
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
    if (!operatorHistoryPath(pathname)) return;
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
    if (operatorHistoryPath(pathname)) scrollPositions.current.set(pathname, window.scrollY);
    entry.current = nextNavigationEntry(entry.current, scope, target, replace);
    const state = operatorHistoryPath(target) ? { prismaNavigation: entry.current } : null;
    if (replace) window.history.replaceState(state, "", target);
    else window.history.pushState(state, "", target);
    pendingScroll.current = scrollPositions.current.get(target) ?? 0;
    setPathname(target);
    return true;
  }
  async function goBack(): Promise<boolean> {
    const previous = previousNavigationPath(entry.current, scope);
    if (!previous || backPending.current) return false;
    backPending.current = true; setGoingBack(true);
    if (!await confirmPrismaNavigation() || currentScope.current !== scope) { backPending.current = false; setGoingBack(false); return false; }
    // Confirmation occurs before changing the URL. The ensuing popstate reuses this approval once.
    approvedBack.current = previous; window.history.back(); return true;
  }
  return { pathname, navigate, goBack, goingBack, canGoBack: Boolean(previousNavigationPath(entry.current, scope)) };
}
