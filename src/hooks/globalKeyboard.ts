import { spawn } from "node:child_process";

export type GlobalKeyboardBackend = "uiohook" | "xinput";

type Listener = () => void;

let backend: GlobalKeyboardBackend | null = null;
let started = false;
let starting: Promise<GlobalKeyboardBackend | null> | null = null;
let stopBackend: (() => void) | null = null;

const listeners = new Set<Listener>();

function emitKeydown() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore
    }
  }
}

async function tryStartUiohook(): Promise<GlobalKeyboardBackend | null> {
  try {
    const mod = (await import("uiohook-napi")) as unknown as {
      uIOhook?: {
        on: (event: "keydown", listener: () => void) => unknown;
        removeListener?: (event: "keydown", listener: () => void) => unknown;
        start: () => void;
        stop: () => void;
      };
      default?: { uIOhook?: unknown };
    };

    const uIOhook =
      mod.uIOhook ??
      ((mod.default as { uIOhook?: unknown } | undefined)?.uIOhook as
        | {
            on: (event: "keydown", listener: () => void) => unknown;
            removeListener?: (event: "keydown", listener: () => void) => unknown;
            start: () => void;
            stop: () => void;
          }
        | undefined);
    if (!uIOhook) return null;

    const onKeydown = () => emitKeydown();
    uIOhook.on("keydown", onKeydown);
    uIOhook.start();

    stopBackend = () => {
      uIOhook.removeListener?.("keydown", onKeydown);
      uIOhook.stop();
    };

    return "uiohook";
  } catch {
    return null;
  }
}

function tryStartXinput(): Promise<GlobalKeyboardBackend | null> {
  if (process.platform !== "linux") return Promise.resolve(null);
  if (!process.env.DISPLAY) return Promise.resolve(null);

  return new Promise((resolve) => {
    let resolved = false;
    const child = spawn("xinput", ["test-xi2", "--root"], {
      stdio: ["ignore", "pipe", "ignore"],
    });

    const resolveOnce = (value: GlobalKeyboardBackend | null) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    child.once("error", () => {
      resolveOnce(null);
    });

    // If we got here, treat it as started; parsing may continue.
    resolveOnce("xinput");

    let buf = "";
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      buf += chunk;
      while (true) {
        const idx = buf.indexOf("\n");
        if (idx === -1) break;
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (/KeyPress/.test(line)) emitKeydown();
      }
    });

    stopBackend = () => {
      child.stdout?.removeAllListeners();
      child.removeAllListeners();
      child.kill();
    };
  });
}

export async function ensureGlobalKeyboard(): Promise<GlobalKeyboardBackend | null> {
  if (started) return backend;
  if (starting) return starting;

  starting = (async () => {
    const uiohook = await tryStartUiohook();
    if (uiohook) return uiohook;
    return await tryStartXinput();
  })();

  backend = await starting;
  started = backend !== null;
  if (!started) stopBackend = null;
  starting = null;

  return backend;
}

function stopIfIdle() {
  if (listeners.size > 0) return;
  if (!started) return;
  started = false;
  backend = null;
  const stop = stopBackend;
  stopBackend = null;
  try {
    stop?.();
  } catch {
    // ignore
  }
}

export function subscribeGlobalKeydown(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    stopIfIdle();
  };
}

