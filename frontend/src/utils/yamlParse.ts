import yaml from 'js-yaml'
import type { GatusConfig } from '../types/gatus'

export function tryParseYaml(content: string): { config: GatusConfig; error: Error | null } {
  try {
    const parsed = yaml.load(content)
    if (parsed == null) return { config: {}, error: null }
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { config: parsed as GatusConfig, error: null }
    }
    return { config: {}, error: new Error('YAML root must be a mapping') }
  } catch (error) {
    return { config: {}, error: error as Error }
  }
}

export function parseYaml(content: string): GatusConfig {
  return tryParseYaml(content).config
}

export function dumpYaml(config: GatusConfig): string {
  return yaml.dump(config, { indent: 2, lineWidth: 120, noRefs: true })
}
