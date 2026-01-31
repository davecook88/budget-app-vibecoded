import { v4 as uuidv4 } from "uuid";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { SyncQueueItem, TransactionInput, Transaction } from "@/lib/types";

const SYNC_QUEUE_KEY = "syncQueue";
const PENDING_TRANSACTIONS_KEY = "pendingTransactions";

// Get pending items from localStorage
export function getSyncQueue(): SyncQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

// Save queue to localStorage
function saveSyncQueue(queue: SyncQueueItem[]) {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

// Add item to sync queue
export function addToSyncQueue(
  type: SyncQueueItem["type"],
  action: SyncQueueItem["action"],
  data: unknown
): string {
  const queue = getSyncQueue();
  const id = uuidv4();

  queue.push({
    id,
    type,
    action,
    data,
    created_at: new Date().toISOString(),
    retries: 0,
  });

  saveSyncQueue(queue);
  return id;
}

// Remove item from sync queue
export function removeFromSyncQueue(id: string) {
  const queue = getSyncQueue();
  saveSyncQueue(queue.filter((item) => item.id !== id));
}

// Add transaction (works offline)
export async function addTransaction(
  input: TransactionInput,
  userId: string
): Promise<{
  data: Transaction | null;
  error: Error | null;
  pending: boolean;
}> {
  const localId = uuidv4();
  const transaction = {
    ...input,
    id: localId,
    local_id: localId,
    user_id: userId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    synced_at: null,
  };

  // If offline or Supabase not configured, store locally
  if (!navigator.onLine || !isSupabaseConfigured()) {
    addToSyncQueue("transaction", "create", transaction);
    savePendingTransaction(transaction as Transaction);
    return { data: transaction as Transaction, error: null, pending: true };
  }

  // Try to sync immediately
  try {
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        ...input,
        user_id: userId,
        local_id: localId,
        synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return { data: data as Transaction, error: null, pending: false };
  } catch {
    // If sync fails, store locally
    addToSyncQueue("transaction", "create", transaction);
    savePendingTransaction(transaction as Transaction);
    return { data: transaction as Transaction, error: null, pending: true };
  }
}

// Get pending transactions from localStorage
export function getPendingTransactions(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PENDING_TRANSACTIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

// Save pending transaction
function savePendingTransaction(transaction: Transaction) {
  const pending = getPendingTransactions();
  pending.push(transaction);
  localStorage.setItem(PENDING_TRANSACTIONS_KEY, JSON.stringify(pending));
}

// Remove pending transaction
function removePendingTransaction(localId: string) {
  const pending = getPendingTransactions();
  localStorage.setItem(
    PENDING_TRANSACTIONS_KEY,
    JSON.stringify(pending.filter((t) => t.local_id !== localId))
  );
}

// Sync all pending items
export async function syncPendingItems(): Promise<{
  synced: number;
  failed: number;
  errors: Error[];
}> {
  if (!navigator.onLine || !isSupabaseConfigured()) {
    return { synced: 0, failed: 0, errors: [] };
  }

  const queue = getSyncQueue();
  let synced = 0;
  let failed = 0;
  const errors: Error[] = [];

  for (const item of queue) {
    try {
      if (item.type === "transaction" && item.action === "create") {
        const transactionData = item.data as Transaction;
        const { error } = await supabase.from("transactions").insert({
          amount: transactionData.amount,
          original_currency: transactionData.original_currency,
          exchange_rate_used: transactionData.exchange_rate_used,
          description: transactionData.description,
          category_id: transactionData.category_id,
          wallet_id: transactionData.wallet_id,
          user_id: transactionData.user_id,
          tags: transactionData.tags,
          type: transactionData.type,
          is_shared: transactionData.is_shared,
          date: transactionData.date,
          local_id: transactionData.local_id,
          synced_at: new Date().toISOString(),
        });

        if (error) throw error;

        removeFromSyncQueue(item.id);
        if (transactionData.local_id) {
          removePendingTransaction(transactionData.local_id);
        }
        synced++;
      }
    } catch (error) {
      failed++;
      errors.push(error as Error);

      // Increment retry count
      const updatedQueue = getSyncQueue();
      const itemIndex = updatedQueue.findIndex((q) => q.id === item.id);
      if (itemIndex >= 0) {
        updatedQueue[itemIndex].retries++;
        // Remove after 5 failed attempts
        if (updatedQueue[itemIndex].retries >= 5) {
          updatedQueue.splice(itemIndex, 1);
        }
        saveSyncQueue(updatedQueue);
      }
    }
  }

  return { synced, failed, errors };
}

// Setup auto-sync when online
export function setupAutoSync(
  onSync?: (result: { synced: number; failed: number }) => void
) {
  if (typeof window === "undefined") return;

  const handleOnline = async () => {
    const result = await syncPendingItems();
    if (onSync) onSync(result);
  };

  window.addEventListener("online", handleOnline);

  // Also try to sync periodically when online
  const intervalId = setInterval(async () => {
    if (navigator.onLine) {
      const queue = getSyncQueue();
      if (queue.length > 0) {
        const result = await syncPendingItems();
        if (onSync) onSync(result);
      }
    }
  }, 30000); // Every 30 seconds

  // Listen for service worker sync message
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", async (event) => {
      if (event.data?.type === "SYNC_TRANSACTIONS") {
        const result = await syncPendingItems();
        if (onSync) onSync(result);
      }
    });
  }

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(intervalId);
  };
}
