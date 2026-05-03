"use client";

import { openDB } from "idb";
import { Timestamp } from "firebase/firestore";

type CacheValue = unknown;

interface CaixaCacheDB {
  cache: {
    key: string;
    value: CacheValue;
  };
}

const DB_NAME = "caixa-dos-amigos-cache";
const STORE_NAME = "cache";

function serializeForCache(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return {
      __type: "timestamp",
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }

  if (Array.isArray(value)) {
    return value.map(serializeForCache);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, serializeForCache(entryValue)]),
    );
  }

  return value;
}

function deserializeFromCache(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(deserializeFromCache);
  }

  if (value && typeof value === "object") {
    const maybeTimestamp = value as {
      __type?: string;
      seconds?: number;
      nanoseconds?: number;
    };

    if (
      maybeTimestamp.__type === "timestamp" &&
      typeof maybeTimestamp.seconds === "number" &&
      typeof maybeTimestamp.nanoseconds === "number"
    ) {
      return new Timestamp(maybeTimestamp.seconds, maybeTimestamp.nanoseconds);
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, deserializeFromCache(entryValue)]),
    );
  }

  return value;
}

async function getDb() {
  return openDB<CaixaCacheDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function writeOfflineCache<T>(key: string, value: T) {
  const db = await getDb();
  await db.put(STORE_NAME, serializeForCache(value), key);
}

export async function readOfflineCache<T>(key: string) {
  const db = await getDb();
  const value = await db.get(STORE_NAME, key);
  return (value ? deserializeFromCache(value) : null) as T | null;
}
