/**
 * Zyra Skills Loader
 * 
 * Loads and parses structured cybersecurity skills following the agentskills.io standard.
 * Supports querying by domain, tags, and framework mappings.
 * 
 * @author Zyra
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface SkillMetadata {
  name: string;
  description: string;
  domain: string;
  subdomain: string;
  tags: string[];
  atlas_techniques?: string[];
  d3fend_techniques?: string[];
  nist_ai_rmf?: string[];
  nist_csf?: string[];
  version: string;
  author: string;
  license: string;
}

export interface Skill {
  metadata: SkillMetadata;
  content: string;
  path: string;
  references?: {
    standards?: string;
    workflows?: string;
  };
}

export interface FrameworkMapping {
  framework: string;
  technique: string;
  skills: string[];
}

export class SkillLoader {
  private skills: Map<string, Skill> = new Map();
  private skillsDir: string;

  constructor(skillsDir: string = path.join(__dirname, 'skills')) {
    this.skillsDir = skillsDir;
  }

  /**
   * Load all skills from the skills directory
   */
  async loadSkills(): Promise<void> {
    const domains = fs.readdirSync(this.skillsDir);
    
    for (const domain of domains) {
      const domainPath = path.join(this.skillsDir, domain);
      if (!fs.statSync(domainPath).isDirectory()) continue;

      const skillDirs = fs.readdirSync(domainPath);
      
      for (const skillDir of skillDirs) {
        const skillPath = path.join(domainPath, skillDir);
        if (!fs.statSync(skillPath).isDirectory()) continue;

        const skillFile = path.join(skillPath, 'SKILL.md');
        if (!fs.existsSync(skillFile)) continue;

        const skill = await this.parseSkill(skillFile);
        this.skills.set(skill.metadata.name, skill);
      }
    }

    console.log(`[Skills] Loaded ${this.skills.size} skills`);
  }

  /**
   * Parse a single skill file
   */
  private async parseSkill(skillPath: string): Promise<Skill> {
    const content = fs.readFileSync(skillPath, 'utf-8');
    
    // Split frontmatter and content
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      throw new Error(`Invalid skill format: ${skillPath}`);
    }

    const frontmatter = match[1];
    const body = match[2];

    const metadata = yaml.load(frontmatter) as SkillMetadata;

    // Load optional references
    const skillDir = path.dirname(skillPath);
    let references: Skill['references'] = {};
    
    const standardsPath = path.join(skillDir, 'references', 'standards.md');
    if (fs.existsSync(standardsPath)) {
      references.standards = fs.readFileSync(standardsPath, 'utf-8');
    }

    const workflowsPath = path.join(skillDir, 'references', 'workflows.md');
    if (fs.existsSync(workflowsPath)) {
      references.workflows = fs.readFileSync(workflowsPath, 'utf-8');
    }

    return {
      metadata,
      content: body,
      path: skillPath,
      references
    };
  }

  /**
   * Get all skills
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skill by name
   */
  getByName(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  /**
   * Get skills by domain
   */
  getByDomain(domain: string): Skill[] {
    return Array.from(this.skills.values())
      .filter(s => s.metadata.domain === domain);
  }

  /**
   * Get skills by subdomain
   */
  getBySubdomain(subdomain: string): Skill[] {
    return Array.from(this.skills.values())
      .filter(s => s.metadata.subdomain === subdomain);
  }

  /**
   * Get skills by tags
   */
  getByTag(tags: string[]): Skill[] {
    return Array.from(this.skills.values())
      .filter(s => tags.some(tag => s.metadata.tags.includes(tag)));
  }

  /**
   * Get skills mapped to a specific framework technique
   */
  getByFramework(framework: string, technique: string): Skill[] {
    return Array.from(this.skills.values()).filter(s => {
      switch (framework.toLowerCase()) {
        case 'mitre-attack':
          // Note: Full ATT&CK mapping is in references/standards.md
          return s.metadata.tags.some(t => 
            t.toLowerCase().includes(technique.toLowerCase())
          );
        case 'mitre-atlas':
          return s.metadata.atlas_techniques?.includes(technique);
        case 'd3fend':
          return s.metadata.d3fend_techniques?.includes(technique);
        case 'nist-csf':
          return s.metadata.nist_csf?.includes(technique);
        case 'nist-ai-rmf':
          return s.metadata.nist_ai_rmf?.includes(technique);
        default:
          return false;
      }
    });
  }

  /**
   * Get all unique domains
   */
  getDomains(): string[] {
    const domains = new Set<string>();
    this.skills.forEach(s => domains.add(s.metadata.domain));
    return Array.from(domains);
  }

  /**
   * Get all unique tags
   */
  getTags(): string[] {
    const tags = new Set<string>();
    this.skills.forEach(s => s.metadata.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }

  /**
   * Search skills by keyword
   */
  search(query: string): Skill[] {
    const q = query.toLowerCase();
    return Array.from(this.skills.values())
      .filter(s => 
        s.metadata.name.includes(q) ||
        s.metadata.description.toLowerCase().includes(q) ||
        s.metadata.tags.some(t => t.includes(q))
      );
  }

  /**
   * Generate framework coverage report
   */
  generateCoverageReport(): Record<string, Record<string, number>> {
    const report: Record<string, Record<string, number>> = {
      'mitre-attack': {},
      'mitre-atlas': {},
      'd3fend': {},
      'nist-csf': {},
      'nist-ai-rmf': {}
    };

    this.skills.forEach(skill => {
      // Count MITRE ATT&CK techniques (simplified)
      // Full mapping would require parsing references/standards.md
      skill.metadata.tags.forEach(tag => {
        if (!report['mitre-attack'][tag]) {
          report['mitre-attack'][tag] = 0;
        }
        report['mitre-attack'][tag]++;
      });

      // MITRE ATLAS
      skill.metadata.atlas_techniques?.forEach(tech => {
        if (!report['mitre-atlas'][tech]) {
          report['mitre-atlas'][tech] = 0;
        }
        report['mitre-atlas'][tech]++;
      });

      // D3FEND
      skill.metadata.d3fend_techniques?.forEach(tech => {
        if (!report['d3fend'][tech]) {
          report['d3fend'][tech] = 0;
        }
        report['d3fend'][tech]++;
      });

      // NIST CSF
      skill.metadata.nist_csf?.forEach(cat => {
        if (!report['nist-csf'][cat]) {
          report['nist-csf'][cat] = 0;
        }
        report['nist-csf'][cat]++;
      });

      // NIST AI RMF
      skill.metadata.nist_ai_rmf?.forEach(cat => {
        if (!report['nist-ai-rmf'][cat]) {
          report['nist-ai-rmf'][cat] = 0;
        }
        report['nist-ai-rmf'][cat]++;
      });
    });

    return report;
  }
}

export default SkillLoader;