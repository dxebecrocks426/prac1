import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";

const execAsync = promisify(exec);

interface DeployContractRequest {
  contractName: string;
  contractPath: string;
}

interface DeployContractResponse {
  success: boolean;
  programId?: string;
  error?: string;
  logs?: string[];
}

// Contract configuration
// Paths are relative to gdx/ directory (one level up from web3)
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

export async function POST(request: NextRequest) {
  try {
    const body: DeployContractRequest = await request.json();
    const { contractName, contractPath } = body;

    // Validate contract name
    if (!CONTRACTS_CONFIG[contractName]) {
      return NextResponse.json(
        {
          success: false,
          error: `Unknown contract: ${contractName}`,
        },
        { status: 400 }
      );
    }

    const config = CONTRACTS_CONFIG[contractName];
    const workspaceRoot = process.cwd();
    const fullContractPath = path.resolve(
      workspaceRoot,
      config.path || contractPath
    );

    // Check if contract directory exists
    try {
      await fs.access(fullContractPath);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: `Contract directory not found: ${fullContractPath}`,
        },
        { status: 404 }
      );
    }

    const logs: string[] = [];
    let programId: string | undefined;

    // Check if anchor CLI is available
    try {
      await execAsync("which anchor");
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Anchor CLI not found. Please install Anchor: cargo install --git https://github.com/coral-xyz/anchor avm --locked --force && avm install latest && avm use latest",
        },
        { status: 500 }
      );
    }

    // Set environment variables
    const env = {
      ...process.env,
      SOLANA_RPC_URL: "http://localhost:8899",
      ANCHOR_PROVIDER_URL: "http://localhost:8899",
    };

    // Step 1: Build the program
    logs.push(`Building ${contractName}...`);
    try {
      const buildResult = await execAsync("anchor build", {
        cwd: fullContractPath,
        env,
      });
      logs.push(
        ...buildResult.stdout.split("\n").filter((line) => line.trim())
      );
      if (buildResult.stderr) {
        logs.push(
          ...buildResult.stderr.split("\n").filter((line) => line.trim())
        );
      }
    } catch (error: any) {
      logs.push(`Build error: ${error.message}`);
      if (error.stdout) {
        logs.push(...error.stdout.split("\n").filter((line) => line.trim()));
      }
      if (error.stderr) {
        logs.push(...error.stderr.split("\n").filter((line) => line.trim()));
      }
      return NextResponse.json(
        {
          success: false,
          error: `Build failed: ${error.message}`,
          logs,
        },
        { status: 500 }
      );
    }

    // Step 2: Deploy the program
    logs.push(`Deploying ${contractName} to localnet...`);
    try {
      // Use --no-idl flag for all contracts (they all have no-idl feature enabled)
      // This matches the CI workflow behavior
      const deployCommand =
        "anchor deploy --no-idl --provider.cluster localnet";

      const deployResult = await execAsync(deployCommand, {
        cwd: fullContractPath,
        env,
      });

      const deployOutput = deployResult.stdout + deployResult.stderr;
      logs.push(...deployOutput.split("\n").filter((line) => line.trim()));

      // Parse program ID from output
      // Anchor deploy output format: "Program Id: <program-id>"
      const programIdMatch = deployOutput.match(
        /Program Id:\s*([A-Za-z0-9]{32,44})/
      );
      if (programIdMatch) {
        programId = programIdMatch[1];
      } else {
        // Try to read from Anchor.toml or target/deploy
        try {
          // Check if there's a keypair file
          const keypairPath = path.join(
            fullContractPath,
            "target/deploy",
            `${contractName.replace(/-/g, "_")}-keypair.json`
          );
          const keypairExists = await fs
            .access(keypairPath)
            .then(() => true)
            .catch(() => false);

          if (keypairExists) {
            // Extract program ID from keypair (would need solana-keygen, but simpler to use Anchor output)
            // For now, use expected program ID if available
            if (config.expectedProgramId) {
              programId = config.expectedProgramId;
            }
          }
        } catch (err) {
          // Ignore errors
        }
      }

      if (!programId) {
        // Fall back to expected program ID
        programId = config.expectedProgramId;
      }

      return NextResponse.json({
        success: true,
        programId,
        logs,
      });
    } catch (error: any) {
      logs.push(`Deploy error: ${error.message}`);
      if (error.stdout) {
        logs.push(...error.stdout.split("\n").filter((line) => line.trim()));
      }
      if (error.stderr) {
        logs.push(...error.stderr.split("\n").filter((line) => line.trim()));
      }

      // Check if program is already deployed
      if (
        error.message.includes("already deployed") ||
        error.message.includes("Program account")
      ) {
        // Program might already be deployed, try to get program ID
        programId = config.expectedProgramId;
        return NextResponse.json({
          success: true,
          programId,
          logs,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: `Deployment failed: ${error.message}`,
          logs,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Unexpected error: ${error.message}`,
      },
      { status: 500 }
    );
  }
}
