import { Connection, PublicKey } from "@solana/web3.js";
import { useDevConsoleStore } from "@/lib/store/use-dev-console-store";

/**
 * Parse transaction logs to detect Cross-Program Invocations (CPIs)
 */
export async function parseCPIsFromTransaction(
  connection: Connection,
  signature: string
): Promise<void> {
  try {
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx || !tx.meta || !tx.meta.logMessages) {
      return;
    }

    const logs = tx.meta.logMessages;
    const programIds = tx.transaction.message.accountKeys.map((key) =>
      typeof key === "string" ? key : key.toBase58()
    );

    // Track program invocations in the log
    const programInvocationStack: string[] = [];
    const cpiCalls: Array<{
      fromProgram: string;
      toProgram: string;
      instruction: string;
      success: boolean;
    }> = [];

    logs.forEach((log, index) => {
      // Detect program invocation start
      // Format: "Program <program_id> invoke [<depth>]"
      const invokeMatch = log.match(/Program (\w+) invoke \[(\d+)\]/);
      if (invokeMatch) {
        const programId = invokeMatch[1];
        const depth = parseInt(invokeMatch[2], 10);
        programInvocationStack[depth] = programId;

        // If depth > 0, this is a CPI
        if (depth > 0 && programInvocationStack[depth - 1]) {
          const fromProgram = programInvocationStack[depth - 1];
          const toProgram = programId;

          // Try to extract instruction name from subsequent logs
          let instruction = "unknown";
          for (let i = index + 1; i < Math.min(index + 10, logs.length); i++) {
            const nextLog = logs[i];
            // Look for instruction names in logs
            const instructionMatch = nextLog.match(/Instruction: (\w+)/);
            if (instructionMatch) {
              instruction = instructionMatch[1];
              break;
            }
          }

          cpiCalls.push({
            fromProgram,
            toProgram,
            instruction,
            success: true, // Will be updated if we find an error
          });
        }
      }

      // Detect program completion
      // Format: "Program <program_id> success" or "Program <program_id> failed"
      const successMatch = log.match(/Program (\w+) success/);
      const failedMatch = log.match(/Program (\w+) failed/);
      if (successMatch || failedMatch) {
        const programId = successMatch ? successMatch[1] : failedMatch![1];
        const success = !!successMatch;

        // Update CPI success status
        cpiCalls.forEach((cpi) => {
          if (cpi.toProgram === programId) {
            cpi.success = success;
          }
        });
      }
    });

    // Add CPI calls to store
    const { addCPICall } = useDevConsoleStore.getState();
    cpiCalls.forEach((cpi) => {
      addCPICall({
        fromProgram: cpi.fromProgram,
        toProgram: cpi.toProgram,
        instruction: cpi.instruction,
        success: cpi.success,
        transaction: signature,
      });
    });
  } catch (error) {
    console.error("Failed to parse CPIs from transaction:", error);
  }
}

/**
 * Monitor recent transactions for CPI calls
 */
export async function monitorCPIs(
  connection: Connection,
  programIds: string[],
  limit: number = 10
): Promise<void> {
  try {
    // Get recent signatures for each program
    for (const programId of programIds) {
      try {
        const signatures = await connection.getSignaturesForAddress(
          new PublicKey(programId),
          { limit }
        );

        for (const sigInfo of signatures) {
          await parseCPIsFromTransaction(connection, sigInfo.signature);
        }
      } catch (error) {
        // Program might not exist yet, skip
        console.debug(`Failed to get signatures for program ${programId}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to monitor CPIs:", error);
  }
}

