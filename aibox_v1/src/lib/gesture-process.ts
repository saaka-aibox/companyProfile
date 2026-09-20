import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const scriptPath = path.resolve(
  process.cwd(),
  "..",
  "Gesture-Scroll-Control",
  "gesture control.py",
);
const defaultPythonPath = path.resolve(
  path.dirname(scriptPath),
  "env",
  "Scripts",
  "python.exe",
);
const pythonPath = process.env.GESTURE_PYTHON ?? defaultPythonPath;

let gestureProcess: ChildProcess | null = null;
let lastError: string | null = null;
let lastOutput: string | null = null;

export function getGestureStatus() {
  return {
    running: gestureProcess !== null && gestureProcess.exitCode === null,
    error: lastError ?? lastOutput,
    pythonPath,
  };
}

export function startGestureProcess() {
  const status = getGestureStatus();

  if (status.running) {
    return status;
  }

  if (!fs.existsSync(/*turbopackIgnore: true*/ pythonPath)) {
    lastError = `Python interpreter not found: ${pythonPath}`;
    return getGestureStatus();
  }

  lastError = null;
  lastOutput = null;
  gestureProcess = spawn(
    /*turbopackIgnore: true*/ process.env.GESTURE_PYTHON ?? defaultPythonPath,
    [scriptPath],
    {
    cwd: path.dirname(scriptPath),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: false,
    },
  );

  gestureProcess.stdout?.on("data", (chunk: Buffer) => {
    lastOutput = chunk.toString().trim();
  });

  gestureProcess.stderr?.on("data", (chunk: Buffer) => {
    lastError = chunk.toString().trim();
  });

  gestureProcess.once("error", (error) => {
    lastError = error.message;
    gestureProcess = null;
  });

  gestureProcess.once("exit", (code) => {
    if (code !== 0) {
      lastError = lastError ?? `Gesture controller exited with code ${code ?? "unknown"}.`;
    }
  });

  return getGestureStatus();
}

export function stopGestureProcess() {
  if (gestureProcess && gestureProcess.exitCode === null) {
    gestureProcess.kill();
  }

  gestureProcess = null;
  return getGestureStatus();
}
