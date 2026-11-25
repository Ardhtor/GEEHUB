#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const assert = require('node:assert/strict');

const manifestPath = new URL('./production_manifest.json', `file://${process.cwd()}/engine/`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

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
for (const field of ['interface_rule', 'continuity_rule', 'function_rule', 'orchestration_rule', 'state_rule', 'verification_rule', 'navigation_rule']) {
  nonEmptyString(execution[field], `execution.${field}`);
}

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
