#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const registryPath = path.join(root, 'docs/credentials/rvia-badge-registry.json');
const applicationsDir = path.join(root, 'docs/credentials/applications');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hasEvidence(value) {
  if (value === true) return true;
  if (Array.isArray(value)) return value.length > 0 && value.every((item) => typeof item === 'string' && item.trim().length > 0);
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

function isVerificationUrl(value) {
  if (typeof value !== 'string') return false;
  if (!/^https:\/\//i.test(value)) return false;
  return !value.includes('...');
}

function discoverApplications(args) {
  if (args.length) return args.map((file) => path.resolve(root, file));
  if (!fs.existsSync(applicationsDir)) return [];
  return fs.readdirSync(applicationsDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(applicationsDir, name));
}

function evaluate(application, registry) {
  const requiredIds = registry.foundationGate.requiredCredentials.map((credential) => credential.id);
  const provided = new Map((application.foundationCredentials || []).map((credential) => [credential.id, credential]));
  const missingFoundation = requiredIds.filter((id) => {
    const credential = provided.get(id);
    return !credential || !isVerificationUrl(credential.verificationUrl);
  });
  const foundationGate = missingFoundation.length === 0;
  const a = application.achievements || {};

  const unlocked = {};
  unlocked['rvia-foundation'] = foundationGate && a.orientation === true;
  unlocked['ontology-contributor'] = unlocked['rvia-foundation'] && hasEvidence(a.mergedOntologyContribution);
  unlocked['ontology-analyst'] = unlocked['ontology-contributor']
    && hasEvidence(a.relationshipAnalysis)
    && hasEvidence(a.provenanceEvidence)
    && hasEvidence(a.reviewEvidence);
  unlocked['ontology-architect'] = unlocked['ontology-analyst']
    && hasEvidence(a.versionedOntologyDesign)
    && hasEvidence(a.documentedClassesRelationsActions)
    && hasEvidence(a.schemaReview);
  unlocked['source-validation-specialist'] = unlocked['rvia-foundation']
    && hasEvidence(a.sourceProvenance)
    && hasEvidence(a.evidenceReferences)
    && hasEvidence(a.validationNotes);
  unlocked['chain-of-custody-verified'] = unlocked['source-validation-specialist']
    && hasEvidence(a.artifactHashesOrImmutableRefs)
    && hasEvidence(a.lineageRecord)
    && hasEvidence(a.auditTrail);
  unlocked['governance-compliance-certified'] = unlocked['ontology-architect']
    && unlocked['chain-of-custody-verified']
    && hasEvidence(a.governancePolicy)
    && hasEvidence(a.authorizationRule)
    && hasEvidence(a.securityRules);

  const allPreMission = [
    'rvia-foundation',
    'ontology-contributor',
    'ontology-analyst',
    'ontology-architect',
    'source-validation-specialist',
    'chain-of-custody-verified',
    'governance-compliance-certified'
  ].every((id) => unlocked[id]);

  unlocked['mission-credentialed'] = false;
  const missionEligibleForReview = allPreMission && hasEvidence(a.publicEvidenceBundle);

  const requested = application.requestedBadges || [];
  const invalidRequested = requested.filter((id) => !registry.badges.some((badge) => badge.id === id));
  const blockedRequested = requested.filter((id) => id !== 'mission-credentialed' && !unlocked[id]);
  const missionRequestedButNotReviewable = requested.includes('mission-credentialed') && !missionEligibleForReview;

  return {
    github: application.github,
    displayName: application.displayName,
    foundationGate: foundationGate ? 'PASS' : 'FAIL',
    missingFoundation,
    unlocked,
    missionEligibleForMaintainerReview: missionEligibleForReview,
    requested,
    invalidRequested,
    blockedRequested,
    missionRequestedButNotReviewable,
    note: 'Mission Credentialed is never auto-issued. It requires maintainer approval and a registry update after evidence review.'
  };
}

const registry = readJson(registryPath);
const applicationFiles = discoverApplications(process.argv.slice(2));

if (applicationFiles.length === 0) {
  console.log('[RVIA badge gate] No applicant manifests found; nothing to validate.');
  process.exit(0);
}

const results = [];
let failed = false;

for (const file of applicationFiles) {
  try {
    const application = readJson(file);
    const result = evaluate(application, registry);
    result.file = path.relative(root, file);
    results.push(result);

    if (result.invalidRequested.length || result.blockedRequested.length || result.missionRequestedButNotReviewable) {
      failed = true;
    }

    console.log(`\n[RVIA badge gate] ${result.github || result.file}`);
    console.log(`  foundation: ${result.foundationGate}`);
    if (result.missingFoundation.length) console.log(`  missing foundation: ${result.missingFoundation.join(', ')}`);
    console.log(`  unlocked: ${Object.entries(result.unlocked).filter(([, value]) => value).map(([id]) => id).join(', ') || 'none'}`);
    console.log(`  mission review eligible: ${result.missionEligibleForMaintainerReview ? 'YES' : 'NO'}`);
    if (result.blockedRequested.length) console.log(`  blocked requested badges: ${result.blockedRequested.join(', ')}`);
  } catch (error) {
    failed = true;
    results.push({ file: path.relative(root, file), error: error instanceof Error ? error.message : String(error) });
    console.error(`[RVIA badge gate] ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

fs.writeFileSync(path.join(root, 'rvia-badge-results.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
console.log('\n[RVIA badge gate] wrote rvia-badge-results.json');
process.exit(failed ? 1 : 0);
