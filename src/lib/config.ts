import * as fs from 'fs';
import * as path from 'path';

export interface SiteConfig {
  name: string;
  tagline: string;
  map: {
    defaultCenter: [number, number];
    defaultZoom: number;
  };
}

export function readConfig(): SiteConfig {
  const configPath = path.join(process.cwd(), 'content', 'config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Site config not found at ${configPath}`);
  }
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as SiteConfig;
}
