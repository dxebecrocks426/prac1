import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { createWriteStream } from "fs";

const execAsync = promisify(exec);

const PID_FILE = path.join(os.tmpdir(), "mock-matching-engine.pid");
const LOG_FILE = path.join(os.tmpdir(), "mock-matching-engine.log");
const PORT = 3003;
// Go up from web3 directory to workspace root, then to services
const MOCK_ENGINE_DIR = path.join(process.cwd(), "..", "services", "gdx-mock-matching-engine", "mock-matching-engine");

interface MockEngineStatus {
  running: boolean;
  pid?: number;
  port: number;
  error?: string;
}

async function checkProcessRunning(pid: number): Promise<boolean> {
  try {
    // Check if process exists (works on both macOS and Linux)
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function checkPortInUse(port: number): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync(
        `netstat -ano | findstr :${port} || echo ""`
      );
      return stdout.trim().length > 0;
    } else {
      const { stdout } = await execAsync(
        `lsof -ti:${port} || echo ""`
      );
      return stdout.trim().length > 0;
    }
  } catch {
    return false;
  }
}

async function getMockEngineStatus(): Promise<MockEngineStatus> {
  try {
    // First try to hit the health endpoint directly (most reliable)
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 2000);
      });
      
      const healthPromise = fetch(`http://localhost:${PORT}/api/health`);
      const healthResponse = await Promise.race([healthPromise, timeoutPromise]);
      
      if (healthResponse.ok) {
        // Service is running and responding
        let pid: number | undefined;
        try {
          const pidContent = await fs.readFile(PID_FILE, "utf-8");
          pid = parseInt(pidContent.trim(), 10);
          if (isNaN(pid)) pid = undefined;
        } catch {
          // PID file doesn't exist, that's okay
        }
        return {
          running: true,
          pid,
          port: PORT,
        };
      }
    } catch {
      // Health check failed, try other methods
    }

    // Fallback: Check if port is in use
    const portInUse = await checkPortInUse(PORT);

    // Try to read PID file
    try {
      const pidContent = await fs.readFile(PID_FILE, "utf-8");
      const pid = parseInt(pidContent.trim(), 10);

      if (!isNaN(pid)) {
        const isRunning = await checkProcessRunning(pid);
        return {
          running: isRunning && portInUse,
          pid: isRunning ? pid : undefined,
          port: PORT,
        };
      }
    } catch {
      // PID file doesn't exist, but port might still be in use
    }

    return {
      running: portInUse,
      port: PORT,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      running: false,
      port: PORT,
      error: errorMessage,
    };
  }
}

async function startMockEngine(): Promise<{ pid: number; error?: string }> {
  try {
    // Check if already running
    const status = await getMockEngineStatus();
    if (status.running) {
      return { pid: status.pid || 0 };
    }

    // Stop any existing processes first
    await stopMockEngine();
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if the mock engine directory exists
    try {
      await fs.access(MOCK_ENGINE_DIR);
    } catch {
      return {
        pid: 0,
        error: `Mock engine directory not found: ${MOCK_ENGINE_DIR}`,
      };
    }

    // Check if dist/index.js exists (built version) or use ts-node for dev
    const distPath = path.join(MOCK_ENGINE_DIR, "dist/index.js");
    const srcPath = path.join(MOCK_ENGINE_DIR, "src/index.ts");
    let useDev = false;
    
    try {
      await fs.access(distPath);
    } catch {
      // Try dev mode with ts-node
      try {
        await fs.access(srcPath);
        useDev = true;
      } catch {
        return {
          pid: 0,
          error: "Mock engine not built. Please run 'npm run build' in the mock engine directory.",
        };
      }
    }

    // Start the mock engine process
    const command = useDev ? "npx" : "node";
    const args = useDev 
      ? ["ts-node", "src/index.ts"]
      : ["dist/index.js"];

    const mockEngineProcess = spawn(command, args, {
      cwd: MOCK_ENGINE_DIR,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PORT: PORT.toString(),
        NODE_ENV: "production",
      },
    });

    const pid = mockEngineProcess.pid!;

    // Save PID to file
    await fs.writeFile(PID_FILE, pid.toString(), "utf-8");

    // Redirect output to log file
    const logStream = createWriteStream(LOG_FILE, { flags: "w" });
    mockEngineProcess.stdout?.pipe(logStream);
    mockEngineProcess.stderr?.pipe(logStream);

    // Detach process so it continues running after parent exits
    mockEngineProcess.unref();

    // Wait a bit and check if process is still running
    await new Promise((resolve) => setTimeout(resolve, 2000));

    if (!(await checkProcessRunning(pid))) {
      await fs.unlink(PID_FILE).catch(() => {});
      return {
        pid: 0,
        error: "Mock engine process failed to start",
      };
    }

    // Wait a bit more for the server to be ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return { pid };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      pid: 0,
      error: `Failed to start mock engine: ${errorMessage}`,
    };
  }
}

async function stopMockEngine(): Promise<void> {
  try {
    // Try to read PID from file first
    let pid: number | null = null;
    try {
      const pidContent = await fs.readFile(PID_FILE, "utf-8");
      pid = parseInt(pidContent.trim(), 10);
      if (isNaN(pid)) {
        pid = null;
      }
    } catch {
      // PID file doesn't exist, that's okay
    }

    // Kill process by PID if we have it
    if (pid !== null) {
      try {
        // Try graceful kill first
        process.kill(pid, "SIGTERM");
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check if still running, force kill if needed
        if (await checkProcessRunning(pid)) {
          process.kill(pid, "SIGKILL");
        }
      } catch (error) {
        // Process might already be dead, that's okay
        console.log("Process already stopped or doesn't exist");
      }
    }

    // Also kill any processes using port 3003 or matching the process name
    try {
      if (process.platform === "win32") {
        // Find process using port 3003
        const { stdout } = await execAsync(
          `netstat -ano | findstr :${PORT} || echo ""`
        );
        if (stdout.trim()) {
          // Extract PID and kill it
          const lines = stdout.trim().split("\n");
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const processPid = parts[parts.length - 1];
            if (processPid && !isNaN(parseInt(processPid))) {
              await execAsync(`taskkill /F /PID ${processPid} 2>nul || echo ""`);
            }
          }
        }
        // Also kill by process name
        await execAsync(`taskkill /F /IM node.exe /FI "WINDOWTITLE eq *mock-matching-engine*" 2>nul || echo ""`);
      } else {
        // Kill process using port 3003
        await execAsync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`);
        // Also kill by process name pattern
        await execAsync(`pkill -9 -f "mock-matching-engine" || true`);
      }
    } catch {
      // Ignore errors - process might not be running
    }

    // Clean up PID file
    try {
      await fs.unlink(PID_FILE);
    } catch {
      // File might not exist, that's okay
    }
  } catch (error) {
    console.error("Error stopping mock engine:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const status = await getMockEngineStatus();
    return NextResponse.json(status);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        running: false,
        port: PORT,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await startMockEngine();

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    // Wait a bit and check if the service is responding
    let isReady = false;
    for (let i = 0; i < 10; i++) {
      try {
        const response = await fetch(`http://localhost:${PORT}/api/health`);
        if (response.ok) {
          isReady = true;
          break;
        }
      } catch {
        // Service not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      pid: result.pid,
      ready: isReady,
      message: isReady
        ? "Mock matching engine started successfully"
        : "Mock matching engine started but health check failed",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await stopMockEngine();
    return NextResponse.json({
      success: true,
      message: "Mock matching engine stopped successfully",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

