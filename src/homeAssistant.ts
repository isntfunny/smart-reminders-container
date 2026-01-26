import HomeAssistant from "homeassistant";

export type HomeAssistantClient = HomeAssistant;

export function createHomeAssistantClient(): HomeAssistantClient {
  const haUrl = process.env.HA_URL || "http://localhost:8123";
  const token = process.env.HA_TOKEN;

  const parsed = new URL(haUrl);
  const host = `${parsed.protocol}//${parsed.hostname}`;
  const port = parsed.port ? Number(parsed.port) : 8123;

  return new HomeAssistant({
    host,
    port,
    token,
    ignoreCert: parsed.protocol === "https:" && parsed.hostname === "localhost"
  });
}
