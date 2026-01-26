declare module "homeassistant" {
  interface HomeAssistantOptions {
    host?: string;
    port?: number;
    token?: string;
    password?: string;
    ignoreCert?: boolean;
  }

  class HomeAssistant {
    constructor(options?: HomeAssistantOptions);
    status(): Promise<unknown>;
    getStates(): Promise<unknown>;
    getState(entityId: string): Promise<unknown>;
    callService(domain: string, service: string, data?: unknown): Promise<unknown>;
  }

  export = HomeAssistant;
}
