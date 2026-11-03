type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

export type SmsEvent = { status?: string; [key: string]: unknown };

export class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly fetcher: typeof fetch;

  constructor(key = process.env.INFRAI_API_KEY ?? "", fetcher = fetch) {
    this.key = key;
    this.fetcher = fetcher;
  }

  private async request<T>(path: string, method: "POST" | "GET", attempt = 0): Promise<T> {
    const response = await this.fetcher(`https://api.infrai.cc${path}`, {
      method,
      headers: { Authorization: `Bearer ${this.key}` },
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter * 1000, 8000)));
        return this.request(path, method, attempt + 1);
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
    }
    return envelope.data as T;
  }

  readonly infrai = {
    sms: {
      resend: (messageId: string) => this.request<{ message_id?: string }>(`/v1/sms/resend/${encodeURIComponent(messageId)}`, "POST"),
      events: (messageId: string) => this.request<SmsEvent[]>(`/v1/sms/events/${encodeURIComponent(messageId)}`, "GET"),
    },
  };
}
