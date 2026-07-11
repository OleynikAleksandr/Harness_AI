export interface NativeCaptureTlsErrorDetail {
  readonly code: string | null;
  readonly message: string;
}

export function buildTlsErrorDetail(error: Error): NativeCaptureTlsErrorDetail {
  const code = (error as Error & { readonly code?: unknown }).code;
  return {
    code: typeof code === "string" ? code : null,
    message: error.message.slice(0, 500),
  };
}
