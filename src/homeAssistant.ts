import { logger } from "./logger";

export type HomeAssistantClient = {
  status: () => Promise<unknown>;
  states: {
    list: () => Promise<unknown[]>;
  };
};

export type HomeAssistantApiConfig = {
  baseUrl: string;
  token: string;
};

function resolveBase(): { baseUrl: string; token: string | null } {
  const raw = process.env.HA_URL || "http://supervisor/core";
  const baseUrl = raw.replace(/\/+$/, "");
  // Supervisor injects SUPERVISOR_TOKEN (alias HASSIO_TOKEN); run.sh re-exports
  // it as HA_TOKEN — but bashio can interfere, so we fall back to both.
  const token =
    process.env.HA_TOKEN ||
    process.env.SUPERVISOR_TOKEN ||
    process.env.HASSIO_TOKEN ||
    null;
  return { baseUrl, token };
}

async function haFetch(path: string): Promise<unknown> {
  const { baseUrl, token } = resolveBase();
  if (!token) {
    throw new Error("HA_TOKEN / SUPERVISOR_TOKEN is not set");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Home Assistant API ${path} returned ${response.status}`);
  }

  return response.json();
}

export function createHomeAssistantClient(): HomeAssistantClient {
  const { baseUrl, token } = resolveBase();
  logger.info(
    "Home Assistant client configured for %s (token=%s)",
    baseUrl,
    token ? "set" : "missing"
  );

  return {
    status: () => haFetch("/api/"),
    states: {
      list: async () => {
        const result = await haFetch("/api/states");
        if (!Array.isArray(result)) {
          throw new Error("Home Assistant /api/states returned non-array");
        }
        return result as unknown[];
      }
    }
  };
}

export function getHomeAssistantApiConfig(): HomeAssistantApiConfig | null {
  const { baseUrl, token } = resolveBase();
  if (!token) {
    return null;
  }
  return { baseUrl, token };
}

export async function saveAutomationConfig(
  config: Record<string, unknown>,
  apiConfig?: HomeAssistantApiConfig | null
): Promise<unknown> {
  const resolved = apiConfig ?? getHomeAssistantApiConfig();
  if (!resolved) {
    throw new Error("HA_TOKEN fehlt. Bitte in der Umgebung setzen.");
  }

  const response = await fetch(`${resolved.baseUrl}/api/config/automation/config`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resolved.token}`
    },
    body: JSON.stringify(config)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: string }).message)
        : `Home Assistant Fehler (${response.status})`;
    throw new Error(errorMessage);
  }

  return payload;
}
