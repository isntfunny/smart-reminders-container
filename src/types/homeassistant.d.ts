declare module "homeassistant" {
  interface HomeAssistantOptions {
    host?: string;
    port?: number;
    token?: string;
    password?: string;
    ignoreCert?: boolean;
  }

  type HomeAssistantState = {
    entity_id: string;
    state: string;
    attributes: Record<string, unknown>;
    last_changed?: string;
    last_updated?: string;
    context?: {
      id?: string;
      parent_id?: string;
      user_id?: string;
    };
  };

  interface ConfigApi {
    status(): Promise<unknown>;
    config(): Promise<unknown>;
    discoveryInfo(): Promise<unknown>;
    bootstrap(): Promise<unknown>;
  }

  interface StatesApi {
    list(): Promise<HomeAssistantState[]>;
    get(domain: string, entityId: string): Promise<HomeAssistantState>;
    update(domain: string, entityId: string, stateData: unknown): Promise<unknown>;
  }

  interface ServicesApi {
    list(): Promise<unknown>;
    call(service: string, domain: string, serviceData?: unknown): Promise<unknown>;
  }

  interface EventsApi {
    list(): Promise<unknown>;
    fire(eventType: string, eventData?: unknown): Promise<unknown>;
  }

  interface HistoryApi {
    state(timestamp: string, filter?: string): Promise<unknown>;
  }

  interface TemplatesApi {
    render(template: string | { template: string }): Promise<unknown>;
  }

  interface CameraApi {
    image(entityId: string): Promise<unknown>;
  }

  interface LogsApi {
    errors(): Promise<unknown>;
  }

  class HomeAssistant {
    constructor(options?: HomeAssistantOptions);
    status(): Promise<unknown>;
    config(): Promise<unknown>;
    discoveryInfo(): Promise<unknown>;
    bootstrap(): Promise<unknown>;

    camera: CameraApi;
    events: EventsApi;
    history: HistoryApi;
    logs: LogsApi;
    services: ServicesApi;
    states: StatesApi;
    templates: TemplatesApi;
  }

  export = HomeAssistant;
}
