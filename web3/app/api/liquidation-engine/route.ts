import { NextRequest, NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { createWriteStream } from "fs";

const execAsync = promisify(exec);

const PID_FILE = path.join(os.tmpdir(), "liquidation-engine.pid");
const LOG_FILE = path.join(os.tmpdir(), "liquidation-engine.log");
const PORT = 8082; // Liquidation Engine port (Settlement Relayer: 8080, Position Management: 8081)
// Go up from web3 directory to workspace root, then to services
const LIQUIDATION_SERVICE_DIR = path.join(process.cwd(), "..", "services", "gdx-liquidation-engine", "liquidation-engine", "liquidation-service");

interface LiquidationEngineStatus {
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

async function getLiquidationEngineStatus(): Promise<LiquidationEngineStatus> {
  try {
    // First try to hit the health endpoint directly (most reliable)
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 2000);
      });
      
      const healthPromise = fetch(`http://localhost:${PORT}/health`);
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

async function startLiquidationEngine(): Promise<{ pid: number; error?: string }> {
  try {
    // Check if already running
    const status = await getLiquidationEngineStatus();
    if (status.running) {
      return { pid: status.pid || 0 };
    }

    // Stop any existing processes first
    await stopLiquidationEngine();
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Check if the liquidation service directory exists
    try {
      await fs.access(LIQUIDATION_SERVICE_DIR);
    } catch {
      return {
        pid: 0,
        error: `Liquidation engine directory not found: ${LIQUIDATION_SERVICE_DIR}`,
      };
    }

    // Check if Cargo.toml exists (Rust project)
    const cargoTomlPath = path.join(LIQUIDATION_SERVICE_DIR, "Cargo.toml");
    try {
      await fs.access(cargoTomlPath);
    } catch {
      return {
        pid: 0,
        error: "Liquidation engine Cargo.toml not found. Please ensure the Rust project is set up.",
      };
    }

    // Get environment variables from request or use defaults
    const solanaRpcUrl = process.env.SOLANA_RPC_URL || "http://127.0.0.1:8899";
    // Use absolute path for database to avoid working directory issues
    // Liquidation engine uses PostgreSQL
    const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost/godark_liquidations";
    
    console.log(`[Liquidation Engine] Database URL: ${databaseUrl.substring(0, 80)}...`);

    // Check if binary exists, build if needed
    const binaryPath = path.join(
      LIQUIDATION_SERVICE_DIR,
      "target",
      "release",
      process.platform === "win32" ? "liquidation-service.exe" : "liquidation-service"
    );

    let useBinary = false;
    try {
      await fs.access(binaryPath);
      useBinary = true;
    } catch {
      // Binary doesn't exist, need to build first
      useBinary = false;
    }

    let liquidationProcess;
    
    try {
      // Log the database URL for debugging (without exposing full path in production)
      console.log(`Starting liquidation engine with DATABASE_URL: ${databaseUrl.substring(0, 50)}...`);
      
      if (useBinary) {
        // Use pre-built binary (much faster)
        liquidationProcess = spawn(binaryPath, [], {
          cwd: LIQUIDATION_SERVICE_DIR,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            SOLANA_RPC_URL: solanaRpcUrl,
            DATABASE_URL: databaseUrl,
            PORT: PORT.toString(),
            RUST_LOG: "liquidation_service=debug,info",
          },
        });
      } else {
        // Build first, then run (slower but works if not built)
        // Note: This will take 30+ seconds on first run
        liquidationProcess = spawn("cargo", ["run", "--release"], {
          cwd: LIQUIDATION_SERVICE_DIR,
          detached: true,
          stdio: ["ignore", "pipe", "pipe"],
          env: {
            ...process.env,
            SOLANA_RPC_URL: solanaRpcUrl,
            DATABASE_URL: databaseUrl,
            PORT: PORT.toString(),
            RUST_LOG: "liquidation_service=debug,info",
          },
        });
      }
    } catch (spawnError) {
      const errorMsg = spawnError instanceof Error ? spawnError.message : String(spawnError);
      return {
        pid: 0,
        error: `Failed to spawn liquidation engine process: ${errorMsg}`,
      };
    }

    if (!liquidationProcess.pid) {
      return {
        pid: 0,
        error: "Failed to start liquidation engine: Process PID is undefined",
      };
    }

    const pid = liquidationProcess.pid;

    // Save PID to file
    await fs.writeFile(PID_FILE, pid.toString(), "utf-8");

    // Redirect output to log file BEFORE detaching
    const logStream = createWriteStream(LOG_FILE, { flags: "w" });
    liquidationProcess.stdout?.pipe(logStream);
    liquidationProcess.stderr?.pipe(logStream);
    
    // Also log to console for debugging
    liquidationProcess.stdout?.on("data", (data) => {
      console.log(`[Liquidation Engine stdout] ${data.toString()}`);
    });
    liquidationProcess.stderr?.on("data", (data) => {
      console.error(`[Liquidation Engine stderr] ${data.toString()}`);
    });

    // Check if process exits immediately (indicates an error)
    // Wait longer for cargo run (compilation) vs binary
    const initialCheckDelay = useBinary ? 2000 : 5000;
    await new Promise((resolve) => setTimeout(resolve, initialCheckDelay));
    
    // Check if process already exited (crashed)
    // For detached processes, we need to check by PID, not exitCode
    const isStillRunning = await checkProcessRunning(pid);
    if (!isStillRunning) {
      // Process exited, read log for error
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Give log time to write
      let errorDetails = "Process exited unexpectedly";
      try {
        const logContent = await fs.readFile(LOG_FILE, "utf-8");
        if (logContent.trim()) {
          errorDetails = logContent;
        }
      } catch {
        // Can't read log yet
      }
      await fs.unlink(PID_FILE).catch(() => {});
      return {
        pid: 0,
        error: `Liquidation engine process crashed: ${errorDetails}`,
      };
    }

    // Detach process so it continues running after parent exits
    liquidationProcess.unref();

    // Wait longer if building (cargo run), shorter if using binary
    const initialWaitTime = useBinary ? 2000 : 5000;
    await new Promise((resolve) => setTimeout(resolve, initialWaitTime));

    if (!(await checkProcessRunning(pid))) {
      // Process died, try to read log for error details
      let errorDetails = "Process exited unexpectedly";
      try {
        const logContent = await fs.readFile(LOG_FILE, "utf-8");
        if (logContent.trim()) {
          errorDetails = logContent.slice(-2000); // Last 2000 chars
        }
      } catch {
        // Can't read log
      }
      await fs.unlink(PID_FILE).catch(() => {});
      return {
        pid: 0,
        error: `Liquidation engine process failed to start: ${errorDetails}`,
      };
    }

    // Wait a bit more for the server to be ready (longer if building)
    const readyWaitTime = useBinary ? 2000 : 5000;
    await new Promise((resolve) => setTimeout(resolve, readyWaitTime));

    return { pid };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      pid: 0,
      error: `Failed to start liquidation engine: ${errorMessage}`,
    };
  }
}

async function stopLiquidationEngine(): Promise<void> {
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

    // Also kill any processes using port 8081 or matching the process name
    try {
      if (process.platform === "win32") {
        // Find process using port 8081
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
              // Only kill if it's our process (check PID file)
              if (pid && parseInt(processPid) === pid) {
                await execAsync(`taskkill /F /PID ${processPid} 2>nul || echo ""`);
              }
            }
          }
        }
        // Also kill by process name
        await execAsync(`taskkill /F /IM cargo.exe /FI "WINDOWTITLE eq *liquidation-service*" 2>nul || echo ""`);
        await execAsync(`taskkill /F /IM liquidation-service.exe 2>nul || echo ""`);
      } else {
        // Kill by process name pattern (more specific)
        await execAsync(`pkill -9 -f "liquidation-service" || true`);
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
    console.error("Error stopping liquidation engine:", error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const status = await getLiquidationEngineStatus();
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
    const result = await startLiquidationEngine();

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    // Wait and check if the service is responding
    // Give more time if we're building (cargo run can take 30+ seconds)
    let isReady = false;
    const maxRetries = 60; // 60 retries = 30 seconds total
    const retryInterval = 500; // 500ms between retries
    let lastError: string | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`http://localhost:${PORT}/health`, {
          signal: AbortSignal.timeout(2000), // 2 second timeout per request
        });
        if (response.ok) {
          isReady = true;
          break;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
        lastError = error instanceof Error ? error.message : String(error);
      }
      
      // Check log file for errors every 5 retries
      if (i > 0 && i % 5 === 0) {
        try {
          const logContent = await fs.readFile(LOG_FILE, "utf-8");
          if (logContent.includes("error") || logContent.includes("Error") || logContent.includes("failed")) {
            // Check if process is still running
            if (result.pid && !(await checkProcessRunning(result.pid))) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Liquidation engine process crashed. Check logs: ${LOG_FILE}`,
                  logPreview: logContent.slice(-500), // Last 500 chars
                },
                { status: 500 }
              );
            }
          }
        } catch {
          // Log file might not exist yet, that's okay
        }
      }
      
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }

    // If not ready, check if process is still running
    if (!isReady && result.pid) {
      const stillRunning = await checkProcessRunning(result.pid);
      if (!stillRunning) {
        // Process crashed, try to read log for error
        let errorDetails = lastError || "Process exited";
        try {
          const logContent = await fs.readFile(LOG_FILE, "utf-8");
          errorDetails = logContent.slice(-1000); // Last 1000 chars
        } catch {
          // Can't read log
        }
        
        return NextResponse.json(
          {
            success: false,
            error: "Liquidation engine process crashed during startup",
            details: errorDetails,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      pid: result.pid,
      ready: isReady,
      message: isReady
        ? "Liquidation engine started successfully"
        : "Liquidation engine started but health check failed (may still be compiling - check logs)",
      note: !isReady ? "If using cargo run, compilation can take 30+ seconds. Consider building first with 'cargo build --release'" : undefined,
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
    await stopLiquidationEngine();
    return NextResponse.json({
      success: true,
      message: "Liquidation engine stopped successfully",
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

