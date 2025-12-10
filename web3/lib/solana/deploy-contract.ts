/**
 * Contract deployment utilities
 * Calls the Next.js API route to deploy Anchor programs
 */

export interface ContractConfig {
  name: string;
  id: string;
  path: string;
  expectedProgramId?: string;
}

export const CONTRACTS: ContractConfig[] = [
  {
    name: "Collateral Vault",
    id: "collateral-vault",
    path: "../contracts/programs/gdx-collateral-vault/collateral-vault",
    expectedProgramId: "6RBLTFwDbjF9CBvnyNzCJL4r5eqzguGKh2n5VaacsoFP",
  },
  {
    name: "Ephemeral Vault",
    id: "ephemeral-vault",
    path: "../contracts/programs/gdx-ephemeral-vault/ephemeral-vault",
    expectedProgramId: "4qjPK7jBAmboCnR71UzeK61RzKGnUnFDtrgjJedu2gKB",
  },
  {
    name: "Funding Rate",
    id: "funding-rate",
    path: "../contracts/programs/gdx-funding-rate/funding-rate",
    expectedProgramId: "zVnpsbtUgvLgLcFkrc3Z7XhC46KLfkr2opdqWMTGSCn",
  },
  {
    name: "Oracle",
    id: "oracle",
    path: "../contracts/programs/gdx-oracle/oracle",
    expectedProgramId: "2ZwnbUhnAL5phE2Sy7nF4pvvqWopkq69HuxmgNkeDS4X",
  },
  {
    name: "Position Management",
    id: "position-mgmt",
    path: "../contracts/programs/gdx-position-mgmt/position-mgmt",
    expectedProgramId: "Gdu24TgaP7HAuuBqBx4RKcBgGN29kKUodZFTKVmJNZYn",
  },
  {
    name: "Settlement Relayer",
    id: "settlement-relayer",
    path: "../services/gdx-settlement-relayer/settlement-relayer",
    expectedProgramId: "CKhnSaDXwqkLjsb53idkM1Ji7recCjh8dWAAbaZChcob",
  },
  {
    name: "Liquidation Engine",
    id: "liquidation-engine",
    path: "../services/gdx-liquidation-engine/liquidation-engine",
    expectedProgramId: "G9UCvPnHtZV8m9QbtY44hBe4M5n8QKReXnNjVhSoJskS",
  },
];

export interface DeployResult {
  success: boolean;
  programId?: string;
  error?: string;
  logs?: string[];
}

export interface DeployProgress {
  contractId: string;
  status: "pending" | "building" | "deploying" | "completed" | "failed";
  programId?: string;
  error?: string;
  logs?: string[];
  logLine?: string; // For streaming logs
}

/**
 * Deploy a single contract with streaming logs
 */
export async function deployContractStream(
  contractId: string,
  onProgress?: (progress: DeployProgress) => void,
  onLog?: (logLine: string, type?: "error" | "info") => void
): Promise<DeployResult> {
  const contract = CONTRACTS.find((c) => c.id === contractId);
  if (!contract) {
    return {
      success: false,
      error: `Unknown contract: ${contractId}`,
    };
  }

  // Notify progress: building
  onProgress?.({
    contractId,
    status: "building",
  });

  try {
    const response = await fetch("/api/deploy-contract-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contractName: contractId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = `HTTP ${response.status}: ${
        errorText || response.statusText
      }`;

      onProgress?.({
        contractId,
        status: "failed",
        error,
      });

      return {
        success: false,
        error,
      };
    }

    // Read SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let programId: string | undefined;
    let currentStatus: "building" | "deploying" | "completed" | "failed" =
      "building";

    if (!reader) {
      throw new Error("No response body");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        const [eventLine, dataLine] = line.split("\n");
        if (!eventLine.startsWith("event:") || !dataLine.startsWith("data:")) {
          continue;
        }

        const event = eventLine.replace("event:", "").trim();
        const data = JSON.parse(dataLine.replace("data:", "").trim());

        switch (event) {
          case "log":
            onLog?.(data.message, data.type || "info");
            onProgress?.({
              contractId,
              status: currentStatus,
              logLine: data.message,
            });
            break;
          case "status":
            currentStatus = data.status;
            onProgress?.({
              contractId,
              status: data.status,
            });
            break;
          case "complete":
            programId = data.programId;
            onProgress?.({
              contractId,
              status: "completed",
              programId: data.programId,
            });
            return {
              success: true,
              programId: data.programId,
            };
          case "error":
            onProgress?.({
              contractId,
              status: "failed",
              error: data.error,
            });
            return {
              success: false,
              error: data.error,
            };
        }
      }
    }

    // If we get here without completion, something went wrong
    return {
      success: false,
      error: "Deployment stream ended unexpectedly",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to deploy contract";

    onProgress?.({
      contractId,
      status: "failed",
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deploy a single contract
 */
export async function deployContract(
  contractId: string,
  onProgress?: (progress: DeployProgress) => void
): Promise<DeployResult> {
  const contract = CONTRACTS.find((c) => c.id === contractId);
  if (!contract) {
    return {
      success: false,
      error: `Unknown contract: ${contractId}`,
    };
  }

  // Notify progress: building
  onProgress?.({
    contractId,
    status: "building",
  });

  try {
    const response = await fetch("/api/deploy-contract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contractName: contractId,
        contractPath: contract.path,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error =
        errorData.error || `HTTP ${response.status}: ${response.statusText}`;

      onProgress?.({
        contractId,
        status: "failed",
        error,
        logs: errorData.logs,
      });

      return {
        success: false,
        error,
        logs: errorData.logs,
      };
    }

    const data: DeployResult = await response.json();

    if (data.success && data.programId) {
      onProgress?.({
        contractId,
        status: "completed",
        programId: data.programId,
        logs: data.logs,
      });
    } else {
      onProgress?.({
        contractId,
        status: "failed",
        error: data.error || "Deployment failed",
        logs: data.logs,
      });
    }

    return data;
  } catch (error: any) {
    const errorMessage = error.message || "Failed to deploy contract";

    onProgress?.({
      contractId,
      status: "failed",
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Deploy all contracts sequentially with streaming logs
 * Sequential deployment ensures programs are available when needed and handles dependencies correctly
 */
export async function deployAllContractsStream(
  onProgress?: (progress: DeployProgress) => void,
  onLog?: (contractId: string, logLine: string, type?: "error" | "info") => void
): Promise<Map<string, DeployResult>> {
  const results = new Map<string, DeployResult>();

  // Deploy all contracts sequentially to ensure proper ordering and availability
  for (const contract of CONTRACTS) {
    const result = await deployContractStream(
      contract.id,
      onProgress,
      (logLine, type) => onLog?.(contract.id, logLine, type)
    );
    
    // Store result even if it failed
    results.set(contract.id, result);
    
    // If deployment failed, log but continue with other contracts
    if (!result.success) {
      console.error(`Failed to deploy ${contract.name}:`, result.error);
    }
    
    // Small delay between deployments to ensure validator processes each one
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Deploy all contracts sequentially
 */
export async function deployAllContracts(
  onProgress?: (progress: DeployProgress) => void
): Promise<Map<string, DeployResult>> {
  return deployAllContractsStream(onProgress);
}

/**
 * Check if a program is already deployed
 */
export async function checkProgramDeployed(
  programId: string,
  rpcEndpoint: string
): Promise<boolean> {
  try {
    const response = await fetch(rpcEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [
          programId,
          {
            encoding: "base58",
          },
        ],
      }),
    });

    const data = await response.json();
    return data.result?.value !== null;
  } catch {
    return false;
  }
}
