import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";

// Contract configuration
const CONTRACTS_CONFIG: Record<
  string,
  { path: string; expectedProgramId?: string }
> = {
  "collateral-vault": {
    path: "../contracts/programs/gdx-collateral-vault/collateral-vault",
    expectedProgramId: "6RBLTFwDbjF9CBvnyNzCJL4r5eqzguGKh2n5VaacsoFP",
  },
  "ephemeral-vault": {
    path: "../contracts/programs/gdx-ephemeral-vault/ephemeral-vault",
    expectedProgramId: "4qjPK7jBAmboCnR71UzeK61RzKGnUnFDtrgjJedu2gKB",
  },
  "funding-rate": {
    path: "../contracts/programs/gdx-funding-rate/funding-rate",
    expectedProgramId: "zVnpsbtUgvLgLcFkrc3Z7XhC46KLfkr2opdqWMTGSCn",
  },
  oracle: {
    path: "../contracts/programs/gdx-oracle/oracle",
    expectedProgramId: "2ZwnbUhnAL5phE2Sy7nF4pvvqWopkq69HuxmgNkeDS4X",
  },
  "position-mgmt": {
    path: "../contracts/programs/gdx-position-mgmt/position-mgmt",
    expectedProgramId: "Gdu24TgaP7HAuuBqBx4RKcBgGN29kKUodZFTKVmJNZYn",
  },
  "settlement-relayer": {
    path: "../services/gdx-settlement-relayer/settlement-relayer",
    expectedProgramId: "CKhnSaDXwqkLjsb53idkM1Ji7recCjh8dWAAbaZChcob",
  },
  "liquidation-engine": {
    path: "../services/gdx-liquidation-engine/liquidation-engine",
    expectedProgramId: "G9UCvPnHtZV8m9QbtY44hBe4M5n8QKReXnNjVhSoJskS",
  },
};

function sendSSE(
  controller: ReadableStreamDefaultController,
  event: string,
  data: Record<string, unknown>
) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { contractName } = body;

  // Validate contract name
  if (!CONTRACTS_CONFIG[contractName]) {
    return new Response(
      JSON.stringify({ error: `Unknown contract: ${contractName}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const config = CONTRACTS_CONFIG[contractName];
  const workspaceRoot = process.cwd();
  const fullContractPath = path.resolve(workspaceRoot, config.path);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Check if contract directory exists
        try {
          await fs.access(fullContractPath);
        } catch {
          sendSSE(controller, "error", {
            error: `Contract directory not found: ${fullContractPath}`,
          });
          controller.close();
          return;
        }

        // Check if anchor CLI is available
        try {
          const { exec } = await import("child_process");
          const { promisify } = await import("util");
          const execAsync = promisify(exec);
          await execAsync("which anchor");
        } catch {
          sendSSE(controller, "error", {
            error:
              "Anchor CLI not found. Please install Anchor: cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest",
          });
          controller.close();
          return;
        }

        // Set environment variables
        const env = {
          ...process.env,
          SOLANA_RPC_URL: "http://localhost:8899",
          ANCHOR_PROVIDER_URL: "http://localhost:8899",
        };

        let programId: string | undefined;

        // Step 1: Build the program
        sendSSE(controller, "log", { message: `Building ${contractName}...` });
        sendSSE(controller, "status", { status: "building" });

        const buildProcess = spawn("anchor", ["build"], {
          cwd: fullContractPath,
          env,
          shell: true,
        });

        // Collect all build output for better error reporting
        const buildOutput: string[] = [];

        buildProcess.stdout.on("data", (data) => {
          const lines = data
            .toString()
            .split("\n")
            .filter((line: string) => line.trim());
          lines.forEach((line: string) => {
            buildOutput.push(line);
            sendSSE(controller, "log", { message: line });
          });
        });

        buildProcess.stderr.on("data", (data) => {
          const lines = data
            .toString()
            .split("\n")
            .filter((line: string) => line.trim());
          lines.forEach((line: string) => {
            buildOutput.push(line);
            sendSSE(controller, "log", { message: line, type: "error" });
          });
        });

        await new Promise<void>((resolve, reject) => {
          buildProcess.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              // Include last 20 lines of output in error message for debugging
              const errorContext = buildOutput.slice(-20).join("\n");
              const errorMessage = `Build failed with exit code ${code}${
                errorContext ? `\n\nLast output:\n${errorContext}` : ""
              }`;
              reject(new Error(errorMessage));
            }
          });
          buildProcess.on("error", (err) => {
            reject(err);
          });
        });

        // Step 2: Deploy the program
        sendSSE(controller, "log", {
          message: `Deploying ${contractName} to localnet...`,
        });
        sendSSE(controller, "status", { status: "deploying" });

        // Use --no-idl flag for all contracts (they all have no-idl feature enabled)
        // This matches the CI workflow behavior
        const deployArgs = [
          "deploy",
          "--no-idl",
          "--provider.cluster",
          "localnet",
        ];

        const deployProcess = spawn("anchor", deployArgs, {
          cwd: fullContractPath,
          env,
          shell: true,
        });

        let deployOutput = "";

        deployProcess.stdout.on("data", (data) => {
          const output = data.toString();
          deployOutput += output;
          const lines = output
            .split("\n")
            .filter((line: string) => line.trim());
          lines.forEach((line: string) => {
            sendSSE(controller, "log", { message: line });
          });
        });

        deployProcess.stderr.on("data", (data) => {
          const output = data.toString();
          deployOutput += output;
          const lines = output
            .split("\n")
            .filter((line: string) => line.trim());
          lines.forEach((line: string) => {
            sendSSE(controller, "log", { message: line, type: "error" });
          });
        });

        await new Promise<void>((resolve, reject) => {
          deployProcess.on("close", (code) => {
            // Parse program ID from output
            const programIdMatch = deployOutput.match(
              /Program Id:\s*([A-Za-z0-9]{32,44})/
            );
            if (programIdMatch) {
              programId = programIdMatch[1];
            } else {
              programId = config.expectedProgramId;
            }

            // Check for various success conditions
            const isSuccess = 
              code === 0 || 
              deployOutput.includes("already deployed") ||
              deployOutput.includes("Program Id:") ||
              deployOutput.includes("Upgrade authority");
            
            // Check for "account already exists" error - this means program is already deployed
            const accountExists = 
              deployOutput.includes("Account allocation failed") ||
              deployOutput.includes("an account with the same address already exists");
            
            if (isSuccess || accountExists) {
              // If account exists, treat as success (program already deployed)
              if (accountExists) {
                sendSSE(controller, "log", { 
                  message: `Program already deployed at ${config.expectedProgramId || "expected address"}`,
                  type: "info"
                });
              }
              resolve();
            } else {
              reject(new Error(`Deploy failed with exit code ${code}`));
            }
          });
          deployProcess.on("error", (err) => {
            reject(err);
          });
        });

        // Send success
        sendSSE(controller, "status", {
          status: "completed",
          programId: programId || config.expectedProgramId,
        });
        sendSSE(controller, "complete", {
          success: true,
          programId: programId || config.expectedProgramId,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        sendSSE(controller, "error", { error: errorMessage });
        sendSSE(controller, "status", { status: "failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
