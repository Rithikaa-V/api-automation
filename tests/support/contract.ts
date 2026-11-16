import { expect } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// The OpenAPI document is the single source of truth: responses are validated against its component schemas.
const spec = parse(readFileSync(path.join(__dirname, '../../openapi/openapi.yaml'), 'utf8'));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(spec, 'openapi');

export type SchemaName = keyof typeof spec.components.schemas;

export function schemaErrors(name: SchemaName, data: unknown): string[] {
  const validate = ajv.getSchema(`openapi#/components/schemas/${String(name)}`);
  if (!validate) throw new Error(`Schema "${String(name)}" not found in openapi.yaml`);
  if (typeof validate(data) !== 'boolean') throw new Error('Async schemas are not supported');
  return (validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`);
}

export function expectSchema(name: SchemaName, data: unknown) {
  expect(schemaErrors(name, data), `response does not match ${String(name)}`).toEqual([]);
}
