import { execFile } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CA_CERTIFICATE_DAYS = "30";
const HOST_CERTIFICATE_DAYS = "7";
const CERTIFICATE_RENEWAL_WINDOW_MS = 24 * 60 * 60 * 1000;
const HOST_SLUG_PATTERN = /[^a-zA-Z0-9.-]/gu;
const CA_CERT_FILE = "harness-native-capture-ca.pem";
const CA_KEY_FILE = "harness-native-capture-ca.key.pem";

export interface NativeCaptureTlsCredentials {
  readonly ca: Buffer;
  readonly cert: Buffer;
  readonly key: Buffer;
}

export interface NativeCaptureCertificateBundle {
  readonly caCertPath: string;
  readonly credentials: NativeCaptureTlsCredentials;
  // Env hints handed to the provider client so it trusts the diagnostic CA:
  // Node clients read NODE_EXTRA_CA_CERTS, non-Node (Codex/Rust) read
  // SSL_CERT_FILE, Python-based clients read REQUESTS_CA_BUNDLE.
  readonly envHints: Readonly<Record<string, string>>;
  readonly hostCertPath: string;
  readonly hostKeyPath: string;
}

type OpenSslRunner = (
  args: readonly string[],
  options: { readonly cwd: string }
) => Promise<void>;

interface NativeCaptureCertificateStoreOptions {
  readonly now?: () => Date;
  readonly opensslPath?: string;
  readonly rootDir?: string;
  readonly runOpenSsl?: OpenSslRunner;
}

// Creates (and reuses across runs) a local diagnostic CA plus per-host leaf
// certificates so the capture proxy can terminate TLS for a provider host.
// The CA is trusted only for capture runs via the returned env hints; it is
// never installed into the OS trust store.
export class NativeCaptureCertificateStore {
  private readonly opensslPath: string;
  private readonly rootDirValue: string;
  private readonly runOpenSsl: OpenSslRunner;
  private readonly now: () => Date;

  constructor(options: NativeCaptureCertificateStoreOptions = {}) {
    this.opensslPath = options.opensslPath ?? "openssl";
    this.rootDirValue = options.rootDir ?? defaultCertDirectory();
    this.now = options.now ?? (() => new Date());
    this.runOpenSsl =
      options.runOpenSsl ??
      ((args, runOptions) => this.defaultRunOpenSsl(args, runOptions));
  }

  get rootDir(): string {
    return this.rootDirValue;
  }

  async prepareHostCredentials(
    hostname: string
  ): Promise<NativeCaptureCertificateBundle> {
    await fs.mkdir(this.rootDirValue, { recursive: true });
    const ca = this.caPaths();
    await this.ensureCertificateAuthority(ca);
    const host = this.hostPaths(hostname);
    await this.ensureHostCertificate(hostname, ca, host);
    const [caCert, hostCert, hostKey] = await Promise.all([
      fs.readFile(ca.certPath),
      fs.readFile(host.certPath),
      fs.readFile(host.keyPath),
    ]);
    return {
      caCertPath: ca.certPath,
      credentials: { ca: caCert, cert: hostCert, key: hostKey },
      envHints: {
        NODE_EXTRA_CA_CERTS: ca.certPath,
        REQUESTS_CA_BUNDLE: ca.certPath,
        SSL_CERT_FILE: ca.certPath,
      },
      hostCertPath: host.certPath,
      hostKeyPath: host.keyPath,
    };
  }

  private async ensureCertificateAuthority(paths: {
    readonly certPath: string;
    readonly keyPath: string;
  }): Promise<void> {
    if (
      (await pathsExist(paths.certPath, paths.keyPath)) &&
      (await this.isCertificateCurrent(paths.certPath))
    ) {
      return;
    }
    await this.clearCertificateDirectory();
    await this.runOpenSsl(
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        paths.keyPath,
        "-out",
        paths.certPath,
        "-days",
        CA_CERTIFICATE_DAYS,
        "-subj",
        "/CN=Harness AI Native Request Capture Local CA",
      ],
      { cwd: this.rootDirValue }
    );
  }

  private async ensureHostCertificate(
    hostname: string,
    ca: { readonly certPath: string; readonly keyPath: string },
    host: {
      readonly certPath: string;
      readonly csrPath: string;
      readonly extPath: string;
      readonly keyPath: string;
    }
  ): Promise<void> {
    if (
      (await pathsExist(host.certPath, host.keyPath)) &&
      (await this.isCertificateCurrent(host.certPath))
    ) {
      return;
    }
    await Promise.all(
      [host.certPath, host.csrPath, host.extPath, host.keyPath].map(
        (filePath) => fs.rm(filePath, { force: true })
      )
    );
    await fs.writeFile(
      host.extPath,
      `subjectAltName=DNS:${hostname}\nextendedKeyUsage=serverAuth\n`,
      "utf8"
    );
    await this.runOpenSsl(
      [
        "req",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        host.keyPath,
        "-out",
        host.csrPath,
        "-subj",
        `/CN=${hostname}`,
      ],
      { cwd: this.rootDirValue }
    );
    await this.runOpenSsl(
      [
        "x509",
        "-req",
        "-in",
        host.csrPath,
        "-CA",
        ca.certPath,
        "-CAkey",
        ca.keyPath,
        "-CAcreateserial",
        "-out",
        host.certPath,
        "-days",
        HOST_CERTIFICATE_DAYS,
        "-sha256",
        "-extfile",
        host.extPath,
      ],
      { cwd: this.rootDirValue }
    );
  }

  private caPaths(): { readonly certPath: string; readonly keyPath: string } {
    return {
      certPath: path.join(this.rootDirValue, CA_CERT_FILE),
      keyPath: path.join(this.rootDirValue, CA_KEY_FILE),
    };
  }

  private hostPaths(hostname: string): {
    readonly certPath: string;
    readonly csrPath: string;
    readonly extPath: string;
    readonly keyPath: string;
  } {
    const slug = hostname.replace(HOST_SLUG_PATTERN, "_");
    return {
      certPath: path.join(this.rootDirValue, `${slug}.cert.pem`),
      csrPath: path.join(this.rootDirValue, `${slug}.csr.pem`),
      extPath: path.join(this.rootDirValue, `${slug}.ext`),
      keyPath: path.join(this.rootDirValue, `${slug}.key.pem`),
    };
  }

  private async defaultRunOpenSsl(
    args: readonly string[],
    options: { readonly cwd: string }
  ): Promise<void> {
    await execFileAsync(this.opensslPath, [...args], { cwd: options.cwd });
  }

  private async isCertificateCurrent(certPath: string): Promise<boolean> {
    try {
      const certificate = new X509Certificate(await fs.readFile(certPath));
      const validFrom = Date.parse(certificate.validFrom);
      const validTo = Date.parse(certificate.validTo);
      const now = this.now().getTime();
      return (
        Number.isFinite(validFrom) &&
        Number.isFinite(validTo) &&
        validFrom <= now &&
        validTo - now > CERTIFICATE_RENEWAL_WINDOW_MS
      );
    } catch {
      return false;
    }
  }

  private async clearCertificateDirectory(): Promise<void> {
    const entries = await fs.readdir(this.rootDirValue);
    await Promise.all(
      entries.map((entry) =>
        fs.rm(path.join(this.rootDirValue, entry), {
          force: true,
          recursive: true,
        })
      )
    );
  }
}

function defaultCertDirectory(): string {
  const home =
    process.env.HARNESS_AI_HOME?.trim() || path.join(homedir(), ".harness-ai");
  return path.join(home, "diagnostics", "native-request-capture", "certs");
}

async function pathsExist(
  ...pathsToCheck: readonly string[]
): Promise<boolean> {
  const results = await Promise.all(
    pathsToCheck.map(async (pathToCheck) => {
      try {
        await fs.access(pathToCheck);
        return true;
      } catch {
        return false;
      }
    })
  );
  return results.every(Boolean);
}
