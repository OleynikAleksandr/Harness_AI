/// <reference types="vite/client" />

interface HarnessProviderTurnRequest {
  model: string;
  prompt: string;
  providerId: string;
}

interface HarnessProviderTurnResponse {
  ok: boolean;
  text: string;
}

interface Window {
  harnessProviders?: {
    runTurn(request: HarnessProviderTurnRequest): Promise<HarnessProviderTurnResponse>;
  };
}
