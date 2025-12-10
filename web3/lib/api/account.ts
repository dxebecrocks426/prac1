import { apiClient } from "./client";

export interface CreateAccountRequest {
  email: string;
  password: string;
  account_name: string;
}

export interface CreateAccountResponse {
  email: string;
  account_id: string;
}

export interface GetAccountIdResponse {
  account_id: string;
}

export interface CreateApiKeyRequest {
  key_name: string;
  ip_whitelist?: string[];
}

export interface ApiKey {
  key_name: string;
  api_key: string;
  secret_key: string;
  passphrase: string;
  ip_whitelist: string[];
  created_at: string;
}

export interface CreateApiKeyResponse {
  api_key: string;
  secret_key: string;
  passphrase: string;
}

export const accountApi = {
  /**
   * Create a new trading account
   */
  createAccount: async (data: CreateAccountRequest) => {
    return apiClient.post<CreateAccountResponse>("/create-account", data);
  },

  /**
   * Get account ID
   */
  getAccountId: async () => {
    return apiClient.post<GetAccountIdResponse>("/get-account-id", {});
  },

  /**
   * Create API key
   */
  createApiKey: async (data: CreateApiKeyRequest) => {
    return apiClient.post<CreateApiKeyResponse>("/create-api-key", data);
  },
};


