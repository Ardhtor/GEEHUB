#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

const manifestPath = path.join(__dirname, 'production_manifest.json');
const anticipationPath = path.resolve(__dirname, '../docs/ANTICIPATORY_PRESENCE.md');
const discoveryPath = path.resolve(__dirname, '../research/discovery/DISCOVERY_PROTOCOL.md');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const anticipation = fs.readFileSync(anticipationPath, 'utf8');
const discovery = fs.readFileSync(discoveryPath, 'utf8');

function nonEmptyString(value, label) {
  assert.equal(typeof value, 'string', `${label} must be a string`);
  assert.ok(value.trim(), `${label} must not be empty`);
}

function stringList(value, label) {
  assert.ok(Array.isArray(value) && value.length > 0, `${label} must be a non-empty array`);
  value.forEach((item, index) => nonEmptyString(item, `${label}[${index}]`));
  assert.equal(new Set(value).size, value.length, `${label} must not contain duplicates`);
}

assert.equal(manifest.version, 1, 'Unsupported production manifest version');
nonEmptyString(manifest.mode, 'mode');
nonEmptyString(manifest.persistence, 'persistence');
stringList(manifest.cycle, 'cycle');
stringList(manifest.input_roots, 'input_roots');
stringList(manifest.output_roots, 'output_roots');
nonEmptyString(manifest.artifact_rule, 'artifact_rule');
nonEmptyString(manifest.unfinished_rule, 'unfinished_rule');
nonEmptyString(manifest.canon_rule, 'canon_rule');

assert.ok(manifest.cycle.includes('observe'), 'The production cycle must include character observation');
assert.ok(manifest.cycle.includes('ambulate'), 'The production cycle must include character movement');

const characterActivity = manifest.character_activity;
assert.ok(characterActivity && characterActivity.enabled === true, 'Character activity must be enabled');
for (const field of ['authorship_rule', 'narrative_output_rule', 'continuity_rule', 'persistence_rule', 'canon_rule']) {
  nonEmptyString(characterActivity[field], `character_activity.${field}`);
}
for (const kind of ['observation', 'ambulation']) {
  const activity = characterActivity[kind];
  assert.ok(activity && typeof activity === 'object', `character_activity.${kind} is required`);
  nonEmptyString(activity.rule, `character_activity.${kind}.rule`);
  stringList(activity.writing, `character_activity.${kind}.writing`);
  stringList(activity.event_fields, `character_activity.${kind}.event_fields`);
}
assert.ok(characterActivity.narrative_output_rule.includes('even when no plot-changing event occurs'),
  'Ordinary observation and movement must still produce narrative writing');
assert.ok(characterActivity.persistence_rule.includes('persisted'),
  'Character writing must be persisted with its activity record');
assert.ok(characterActivity.canon_rule.includes('do not become world canon automatically'),
  'Observation and interpretation must not be promoted to canon automatically');

const execution = manifest.execution;
assert.ok(execution && typeof execution === 'object', 'execution configuration is required');
assert.equal(execution.instance_model, 'single-persistent-instance', 'GEEHUB must use one persistent task instance');
const expectedLifecycle = [
  'receive',
  'recover_prior_task_state',
  'retrieve_relevant_corpus_and_assets',
  'resolve_shared_contexts',
  'execute_existing_functions',
  'verify_outputs',
  'persist_state_and_artifacts',
  'carry_forward_unfinished_work'
];
assert.deepEqual(execution.task_lifecycle, expectedLifecycle, 'Task lifecycle order changed unexpectedly');
for (const field of ['interface_rule', 'continuity_rule', 'function_rule', 'orchestration_rule', 'state_rule', 'verification_rule', 'navigation_rule', 'context_rule', 'knowledge_state_rule', 'prediction_rule', 'algorithm_rule', 'decision_rule', 'communication_rule', 'learning_rule']) {
  nonEmptyString(execution[field], `execution.${field}`);
}

// Keep the human-readable operating contract aligned with the machine-readable rules.
assert.ok(anticipation.includes('## Information, prediction, and method selection'),
  'Anticipatory Presence must define the instance information and method policy');
assert.ok(anticipation.includes('## Current implementation boundary'),
  'Anticipatory Presence must distinguish specification from deployed capability');
for (const state of ['Known:', 'Available:', 'Inferred:', 'Predicted:', 'Unknown:']) {
  assert.ok(anticipation.includes(state), `Anticipatory Presence must define information state: ${state}`);
}
for (const method of ['semantic retrieval', 'graph traversal', 'trend extrapolation', 'scenario and constraint analysis']) {
  assert.ok(anticipation.includes(method), `Anticipatory Presence must define method selection: ${method}`);
}
assert.ok(anticipation.includes('A prediction is never presented as an observed fact'),
  'Predictions must remain distinct from observed facts');
assert.ok(discovery.includes('## Discovery as part of the active task'),
  'Discovery must begin inside the active task');
assert.ok(discovery.includes('does not perform live internet searches'),
  'Manual discovery intake must not be represented as a live search connector');
assert.ok(execution.prediction_rule.includes('horizon') && execution.prediction_rule.includes('baseline'),
  'Prediction policy must preserve horizon and baseline');
assert.ok(execution.algorithm_rule.includes('simplest adequate method'),
  'Algorithm policy must prefer the simplest adequate method');

const maintenance = manifest.maintenance;
assert.ok(maintenance && typeof maintenance === 'object', 'maintenance rules are required');
nonEmptyString(maintenance.scope, 'maintenance.scope');
stringList(maintenance.examples, 'maintenance.examples');
for (const required of ['fix reproducible bugs', 'Add or update tests', 'Maintain manifests']) {
  assert.ok(maintenance.examples.some(example => example.toLowerCase().includes(required.toLowerCase())),
    `maintenance examples must cover: ${required}`);
}
nonEmptyString(maintenance.completion_rule, 'maintenance.completion_rule');
nonEmptyString(maintenance.constraint, 'maintenance.constraint');
assert.match(maintenance.constraint, /single persistent task instance/i,
  'Maintenance must remain inside the single task instance');

console.log('Production manifest structure, task lifecycle, and maintenance examples verified.');
