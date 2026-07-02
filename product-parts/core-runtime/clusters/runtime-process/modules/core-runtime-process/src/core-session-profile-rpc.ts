import { ProfileAuthoringFacade } from "../../../../session-profiles/modules/profile-authoring/src/profile-authoring-facade.js";
import {
  ProfileCatalogFacade,
  type SessionProfileCatalogEntry,
} from "../../../../session-profiles/modules/profile-catalog/src/profile-catalog-facade.js";
import {
  ProfileStoreFacade,
  type SessionProfileDocumentPaths,
} from "../../../../session-profiles/modules/profile-store/src/profile-store-facade.js";
import { readSessionProfileMemory } from "../../../../settings-and-localization/modules/settings-store/src/session-profile-memory.js";

const profileStore = new ProfileStoreFacade();
const profileCatalog = new ProfileCatalogFacade({ profileStore });
const profileAuthoring = new ProfileAuthoringFacade({ profileStore });

/**
 * Catalog read model for the picker and the Profile Creator tab. Listing
 * triggers first-access seeding inside the catalog; the per-provider last
 * selection and AutoNormalizer flags come from Core settings memory so the
 * renderer never owns preselection truth.
 */
export async function listSessionProfilesRpcResult(payload: unknown): Promise<
  | { error: string; ok: false }
  | {
      autoNormalizerByProvider: Readonly<Record<string, boolean>>;
      lastSelectedProfileByProvider: Readonly<Record<string, string>>;
      ok: true;
      profiles: readonly SessionProfileCatalogEntry[];
    }
> {
  try {
    const providerId = readPayloadString(payload, "providerId");
    const profiles = providerId
      ? await profileCatalog.listProfilesForProvider(providerId)
      : await profileCatalog.listAllProfiles();
    const memory = await readSessionProfileMemory();
    return {
      autoNormalizerByProvider: memory.autoNormalizerByProvider,
      lastSelectedProfileByProvider: memory.lastSelectedProfileByProvider,
      ok: true,
      profiles,
    };
  } catch (error) {
    return { error: stringifyError(error), ok: false };
  }
}

/** Creates a profile from the templates (universal or individual). */
export async function createSessionProfileRpcResult(
  payload: unknown
): Promise<
  | { documents: SessionProfileDocumentPaths; id: string; ok: true }
  | { error: string; ok: false }
> {
  try {
    await profileStore.ensureSeededProfiles();
    const provider = readPayloadString(payload, "provider");
    const result = await profileAuthoring.createProfile({
      name: readPayloadString(payload, "name") ?? "",
      ...(provider ? { provider } : {}),
    });
    if (!result.ok) {
      return { error: result.error, ok: false };
    }
    return { documents: result.documents, id: result.id, ok: true };
  } catch (error) {
    return { error: stringifyError(error), ok: false };
  }
}

/**
 * Resolves a profile document path for the "edit in VS Code" action (the
 * renderer opens it through the existing vscode link opener). Native has no
 * files by definition.
 */
export async function openSessionProfileFileRpcResult(
  payload: unknown
): Promise<{ error: string; ok: false } | { filePath: string; ok: true }> {
  try {
    const profileId = readPayloadString(payload, "profileId");
    if (!profileId || profileId === "native") {
      return {
        error: "The Native profile has no editable files.",
        ok: false,
      };
    }
    await profileStore.ensureSeededProfiles();
    const documents = profileAuthoring.resolveDocumentPaths(profileId);
    const filePath = pickProfileDocument(
      documents,
      readPayloadString(payload, "document")
    );
    return { filePath, ok: true };
  } catch (error) {
    return { error: stringifyError(error), ok: false };
  }
}

function pickProfileDocument(
  documents: SessionProfileDocumentPaths,
  document?: string
): string {
  switch (document) {
    case "passport":
      return documents.passportPath;
    case "tooling":
      return documents.toolingPath;
    default:
      return documents.promptPath;
  }
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readPayloadString(payload: unknown, key: string): string | undefined {
  if (typeof payload !== "object" || payload === null) {
    return;
  }
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
