import "server-only";
import type { Activity } from "../activities/activityTypes";
// A bounded process-local cache plus in-flight deduplication. Replace this adapter
// with object storage later without changing questions or browser components.
export class SceneCache {
  private entries = new Map<string, { value: Activity; expires: number }>();
  private pending = new Map<string, Promise<Activity>>();
  constructor(
    private max = 8,
    private ttl = 24 * 60 * 60 * 1000,
  ) {}
  async get(
    key: string,
    create: () => Promise<Activity>,
    regenerate = false,
  ): Promise<Activity> {
    const pending = this.pending.get(key);
    if (pending) return pending;
    const cached = this.entries.get(key);
    if (!regenerate && cached && cached.expires > Date.now())
      return structuredClone(cached.value);
    const task = create()
      .then((value) => {
        this.entries.delete(key);
        this.entries.set(key, { value, expires: Date.now() + this.ttl });
        while (this.entries.size > this.max)
          this.entries.delete(this.entries.keys().next().value!);
        return structuredClone(value);
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, task);
    return task;
  }
}
export const sceneCache = new SceneCache();
