const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://godark.goquant.io/testnet";

export interface ApiResponse<T> {
  timestamp: string;
  code: number;
  data: T;
  message?: string;
}

export class ApiError extends Error {
  constructor(
    public code: number,
    public message: string,
    public timestamp?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private baseUrl: string;
  private handshakeToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Get token from localStorage or context
    if (typeof window !== "undefined") {
      this.handshakeToken = localStorage.getItem("handshake_token");
    }
  }

  setHandshakeToken(token: string) {
    this.handshakeToken = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("handshake_token", token);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.handshakeToken) {
      headers["Handshake-Token"] = this.handshakeToken;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.code || response.status,
        errorData.message || response.statusText,
        errorData.timestamp
      );
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();


