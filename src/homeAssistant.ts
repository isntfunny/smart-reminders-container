import HomeAssistant from "homeassistant";
import { logger } from "./logger";

export type HomeAssistantClient = HomeAssistant;

export function createHomeAssistantClient(): HomeAssistantClient {
  const haUrl = process.env.HA_URL || "http://localhost:8123";
  const token = process.env.HA_TOKEN;

  const parsed = new URL(haUrl);
  const host = `${parsed.protocol}//${parsed.hostname}`;
  const port = parsed.port ? Number(parsed.port) : 8123;
  const ignoreCert = parsed.protocol === "https:" && parsed.hostname === "localhost";

  logger.info("Home Assistant client configured for %s:%d", host, port);

  return new HomeAssistant({
    host,
    port,
    token,
    ignoreCert
  });
}

export type HomeAssistantApiConfig = {
  baseUrl: string;
  token: string;
};

export function getHomeAssistantApiConfig(): HomeAssistantApiConfig | null {
  const haUrl = process.env.HA_URL || "http://localhost:8123";
  const token = process.env.HA_TOKEN;
  if (!token) {
    return null;
  }

  const parsed = new URL(haUrl);
  const host = `${parsed.protocol}//${parsed.hostname}`;
  const port = parsed.port ? Number(parsed.port) : 8123;

  return {
    baseUrl: `${host}:${port}`,
    token
  };
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
