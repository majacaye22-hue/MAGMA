export type UploadDraft = {
  eventDetails?: import("./event-details").EventDetailsDraft;
  selectedType: "arte" | "música" | "fotografía" | "evento" | "escrito" | "video" | null;
  title: string; description: string; richContent: string; soundCloudUrl: string;
  tags: string; location: string; selectedProject: string;
  collaboratorUsernames?: string;
  openCollab: boolean; collabDescription: string; commentsEnabled: boolean; isSensitive: boolean;
  eventDate: string; eventTime: string; venue: string; address: string; isFree: boolean; price: string;
  file: File | null; coverFile: File | null; photos: (File | string)[];
};
export type SavedUploadDraft = { version: 1; savedAt: number; value: UploadDraft };

export function uploadDraftKey(userId: string, context: string) {
  return JSON.stringify([userId, context]);
}

export type DraftListing = { key: string; title: string; type: string; savedAt: number; href: string };

export async function listUploadDrafts(userId: string): Promise<DraftListing[]> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("magma-upload-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("draft storage blocked"));
  });
  return new Promise((resolve, reject) => {
    const rows: DraftListing[] = [];
    const transaction = db.transaction("drafts", "readonly");
    const request = transaction.objectStore("drafts").openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      try {
        const [owner, context] = JSON.parse(String(cursor.key));
        if (owner === userId) {
          const saved = cursor.value as SavedUploadDraft;
          const [type, project, colectivo] = JSON.parse(context);
          if (saved.version === 1 && saved.value) {
            const params = new URLSearchParams({ draft: "resume" });
            if (typeof type === "string") params.set("type", type);
            if (typeof project === "string") params.set("proyecto", project);
            if (typeof colectivo === "string") params.set("colectivo", colectivo);
            rows.push({ key: String(cursor.key), title: saved.value.title || "sin título", type: saved.value.selectedType || "obra", savedAt: saved.savedAt, href: `/upload?${params}` });
          }
        }
      } catch { /* Ignore incompatible records without deleting them. */ }
      cursor.continue();
    };
    transaction.oncomplete = () => { db.close(); resolve(rows.sort((a, b) => b.savedAt - a.savedAt)); };
    transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("draft storage failed")); };
  });
}

// IndexedDB preserves Files without uploading unpublished media to public storage.
export async function draftOperation<T>(key: string, operation: "read" | "save" | "delete", value?: SavedUploadDraft): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("magma-upload-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("draft storage blocked"));
  });
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", operation === "read" ? "readonly" : "readwrite");
    const store = transaction.objectStore("drafts");
    const request = operation === "read" ? store.get(key) : operation === "delete" ? store.delete(key) : store.put(value, key);
    transaction.oncomplete = () => { db.close(); resolve(request.result as T); };
    transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error("draft storage failed")); };
  });
}
