import yaml from 'js-yaml'
import type { GatusConfig } from '../types/gatus'

export function parseYaml(content: string): GatusConfig {
  try {
    const parsed = yaml.load(content)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as GatusConfig
    }
  } catch {
    // ignore parse errors — caller decides how to handle
  }
  return {}
}

export function dumpYaml(config: GatusConfig): string {
  return yaml.dump(config, { indent: 2, lineWidth: 120, noRefs: true })
}
