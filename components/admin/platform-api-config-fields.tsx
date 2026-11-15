"use client"

import { ApiConfigSchema, type PlatformApiConfig } from "@/lib/platform/schemas"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export interface ApiConfigDraft {
  apiName: string
  baseUrl: string
  endpointPath: string
  periodField: string
  resultField: string
  timestampField: string
  authentication: "none" | "bearer_env" | "header_env"
  secretEnvName: string
  headerName: string
  queryParameters: string
  timeoutMs: string
}

export const EMPTY_API_CONFIG_DRAFT: ApiConfigDraft = {
  apiName: "",
  baseUrl: "",
  endpointPath: "",
  periodField: "",
  resultField: "",
  timestampField: "",
  authentication: "none",
  secretEnvName: "",
  headerName: "X-API-Key",
  queryParameters: "{}",
  timeoutMs: "8000",
}

export function toApiConfigDraft(config?: PlatformApiConfig): ApiConfigDraft {
  if (!config) return EMPTY_API_CONFIG_DRAFT
  return {
    apiName: config.apiName,
    baseUrl: config.baseUrl,
    endpointPath: config.endpointPath,
    periodField: config.responseMapping.periodField,
    resultField: config.responseMapping.resultField,
    timestampField: config.responseMapping.timestampField ?? "",
    authentication: config.authentication.method,
    secretEnvName: config.authentication.method === "none" ? "" : config.authentication.secretEnvName,
    headerName: config.authentication.method === "header_env" ? config.authentication.headerName : "X-API-Key",
    queryParameters: JSON.stringify(config.queryParameters, null, 2),
    timeoutMs: String(config.timeoutMs),
  }
}

export function buildApiConfig(draft: ApiConfigDraft): PlatformApiConfig {
  const authentication =
    draft.authentication === "none"
      ? { method: "none" as const }
      : draft.authentication === "bearer_env"
        ? { method: "bearer_env" as const, secretEnvName: draft.secretEnvName.trim() }
        : {
            method: "header_env" as const,
            headerName: draft.headerName.trim(),
            secretEnvName: draft.secretEnvName.trim(),
          }
  let queryParameters: unknown
  try {
    queryParameters = JSON.parse(draft.queryParameters)
  } catch {
    throw new Error("Query parameters must be valid JSON.")
  }
  const responseMapping = {
    periodField: draft.periodField.trim(),
    resultField: draft.resultField.trim(),
    ...(draft.timestampField.trim() ? { timestampField: draft.timestampField.trim() } : {}),
  }
  return ApiConfigSchema.parse({
    apiName: draft.apiName.trim(),
    baseUrl: draft.baseUrl.trim(),
    endpointPath: draft.endpointPath.trim(),
    queryParameters,
    authentication,
    responseMapping,
    timeoutMs: Number(draft.timeoutMs),
    retryCount: 1,
  })
}

interface PlatformApiConfigFieldsProps {
  value: ApiConfigDraft
  onChange: (value: ApiConfigDraft) => void
}

export function PlatformApiConfigFields({ value, onChange }: PlatformApiConfigFieldsProps) {
  const update = (key: keyof ApiConfigDraft, next: string) => onChange({ ...value, [key]: next })

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-background/30 p-4">
      <div>
        <h3 className="text-sm font-semibold">Server-side API mapping</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Only HTTPS GET endpoints are supported. Secret values stay in server environment variables.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs text-muted-foreground">
          API name
          <Input value={value.apiName} onChange={(event) => update("apiName", event.target.value)} />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">
          Base URL (HTTPS host)
          <Input value={value.baseUrl} onChange={(event) => update("baseUrl", event.target.value)} placeholder="https://api.example.com" />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">
          Endpoint path
          <Input value={value.endpointPath} onChange={(event) => update("endpointPath", event.target.value)} placeholder="/v1/results/latest" />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">
          Request timeout (ms)
          <Input type="number" min={1000} max={15000} value={value.timeoutMs} onChange={(event) => update("timeoutMs", event.target.value)} />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">
          Period field path
          <Input value={value.periodField} onChange={(event) => update("periodField", event.target.value)} placeholder="data.latest.period" />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">
          Result field path
          <Input value={value.resultField} onChange={(event) => update("resultField", event.target.value)} placeholder="data.latest.result" />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">
          Timestamp field path (optional)
          <Input value={value.timestampField} onChange={(event) => update("timestampField", event.target.value)} placeholder="data.latest.timestamp" />
        </label>
        <label className="space-y-1.5 text-xs text-muted-foreground">
          Authentication
          <select
            value={value.authentication}
            onChange={(event) => update("authentication", event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="none">None</option>
            <option value="bearer_env">Bearer token from server env</option>
            <option value="header_env">Header token from server env</option>
          </select>
        </label>
        {value.authentication !== "none" && (
          <>
            {value.authentication === "header_env" && (
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Auth header name
                <Input value={value.headerName} onChange={(event) => update("headerName", event.target.value)} placeholder="X-API-Key" />
              </label>
            )}
            <label className="space-y-1.5 text-xs text-muted-foreground sm:col-span-2">
              Secret environment variable name
              <Input value={value.secretEnvName} onChange={(event) => update("secretEnvName", event.target.value)} placeholder="GAME_API_SECRET_VENDOR" />
              <span className="block text-[11px]">The variable name is saved. Its secret value is never sent to this page.</span>
            </label>
          </>
        )}
        <label className="space-y-1.5 text-xs text-muted-foreground sm:col-span-2">
          Query parameters (JSON object)
          <Textarea value={value.queryParameters} onChange={(event) => update("queryParameters", event.target.value)} rows={3} />
        </label>
      </div>
    </div>
  )
}
