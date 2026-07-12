import packageJson from '../../package.json'

export type AppVersion = {
  name: string
  version: string
  environment: string
  commit: string | null
}

export function getAppVersion(): AppVersion {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || null

  return {
    name: packageJson.name,
    version: packageJson.version,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    commit: commit ? commit.slice(0, 7) : null,
  }
}

export function getVersionLabel(version: AppVersion) {
  return version.commit ? `v${version.version} (${version.commit})` : `v${version.version}`
}
