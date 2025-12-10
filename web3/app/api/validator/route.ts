import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { createWriteStream } from "fs";

const execAsync = promisify(exec);

const PID_FILE = path.join(os.tmpdir(), "solana-validator.pid");
const LOG_FILE = path.join(os.tmpdir(), "solana-validator.log");

interface ValidatorStatus {
  running: boolean;
  pid?: number;
  rpcEndpoint: string;
  healthCheck?: boolean;
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

async function checkRpcHealth(): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `solana cluster-version --url http://127.0.0.1:8899 2>/dev/null || echo "ERROR"`
    );
    return !stdout.includes("ERROR") && stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function getValidatorStatus(): Promise<ValidatorStatus> {
  try {
    const pidContent = await fs.readFile(PID_FILE, "utf-8");
    const pid = parseInt(pidContent.trim(), 10);

    if (isNaN(pid)) {
      return {
        running: false,
        rpcEndpoint: "http://localhost:8899",
      };
    }

    const isRunning = await checkProcessRunning(pid);
    const healthCheck = isRunning ? await checkRpcHealth() : false;

    return {
      running: isRunning && healthCheck,
      pid: isRunning ? pid : undefined,
      rpcEndpoint: "http://localhost:8899",
      healthCheck,
    };
  } catch {
    // PID file doesn't exist or can't be read
    return {
      running: false,
      rpcEndpoint: "http://localhost:8899",
    };
  }
}

async function stopValidator(): Promise<void> {
  try {
    // Try to read PID file, but don't error if it doesn't exist
    let pid: number | null = null;
    try {
      const pidContent = await fs.readFile(PID_FILE, "utf-8");
      pid = parseInt(pidContent.trim(), 10);
      if (isNaN(pid)) {
        pid = null;
      }
    } catch (error: any) {
      // PID file doesn't exist - that's fine, validator might not be running
      if (error.code !== "ENOENT") {
        console.log("Could not read PID file:", error.message);
      }
    }

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

    // Also kill any other solana-test-validator processes
    try {
      if (process.platform === "win32") {
        await execAsync(`taskkill /F /IM solana-test-validator.exe 2>nul || echo ""`);
      } else {
        await execAsync(`pkill -9 -f solana-test-validator || true`);
      }
    } catch {
      // Ignore errors
    }

    // Clean up PID file if it exists
    try {
      await fs.unlink(PID_FILE);
    } catch {
      // File might not exist, that's okay
    }
  } catch (error) {
    // Don't log errors for missing PID file - it's expected if validator isn't running
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (!errorMessage.includes("ENOENT") && !errorMessage.includes("no such file")) {
      console.error("Error stopping validator:", error);
    }
  }
}

async function startValidator(forceReset: boolean = false): Promise<{ pid: number; error?: string }> {
  try {
    // Check if already running
    const status = await getValidatorStatus();
    if (status.running && !forceReset) {
      return { pid: status.pid! };
    }

    // Stop any existing validator processes first
    await stopValidator();
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Start new validator process
    const validatorProcess = spawn("solana-test-validator", ["--reset", "--quiet"], {
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const pid = validatorProcess.pid!;

    // Save PID to file
    await fs.writeFile(PID_FILE, pid.toString(), "utf-8");

    // Redirect output to log file
    const logStream = createWriteStream(LOG_FILE, { flags: "w" });
    validatorProcess.stdout?.pipe(logStream);
    validatorProcess.stderr?.pipe(logStream);

    // Detach process so it continues running after parent exits
    validatorProcess.unref();

    // Wait a bit and check if process is still running
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (!(await checkProcessRunning(pid))) {
      await fs.unlink(PID_FILE).catch(() => {});
      return {
        pid: 0,
        error: "Validator process failed to start",
      };
    }

    return { pid };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      pid: 0,
      error: `Failed to start validator: ${errorMessage}`,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const status = await getValidatorStatus();
    return NextResponse.json(status);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        running: false,
        rpcEndpoint: "http://localhost:8899",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if force reset is requested (for onboarding flow)
    const body = await request.json().catch(() => ({}));
    const forceReset = body.forceReset === true;
    
    const result = await startValidator(forceReset);

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    // Wait for validator to be ready (health check)
    let healthCheck = false;
    for (let i = 0; i < 60; i++) {
      healthCheck = await checkRpcHealth();
      if (healthCheck) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return NextResponse.json({
      success: true,
      pid: result.pid,
      healthCheck,
      message: healthCheck
        ? "Validator started successfully"
        : "Validator started but health check failed",
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
    await stopValidator();
    return NextResponse.json({
      success: true,
      message: "Validator stopped successfully",
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

