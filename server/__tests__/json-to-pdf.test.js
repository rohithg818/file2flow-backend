const { classifyJson, classifyValue, isSystemField, isUuidValue } = require('../classify');

// ============================================================
// Test Data
// ============================================================

const flatRecord = {
  company_name: 'Acme Corp',
  industry: 'Manufacturing',
  founded: '1985-03-15',
  employee_count: 450,
  headquarters: 'Portland, OR',
};

const nestedObject = {
  project: {
    name: 'Phoenix Migration',
    status: 'Active',
    budget: 250000,
    lead: {
      name: 'Sarah Chen',
      email: 'sarah@acme.com',
    },
  },
  team_size: 12,
};

const shortUniformRecords = [
  { id: 1, name: 'Alice', role: 'Engineer', department: 'Platform' },
  { id: 2, name: 'Bob', role: 'Designer', department: 'Product' },
  { id: 3, name: 'Carol', role: 'Manager', department: 'Platform' },
  { id: 4, name: 'Dave', role: 'Analyst', department: 'Data' },
];

const longTextRecords = [
  {
    title: 'Q1 Revenue Report',
    summary: 'Total revenue for Q1 reached $4.2M, representing a 15% increase over the previous quarter. Growth was driven primarily by enterprise deals in the APAC region, with three new Fortune 500 contracts signed during the period.',
    category: 'Financial',
  },
  {
    title: 'Infrastructure Audit',
    summary: 'The infrastructure audit revealed several areas for improvement including outdated TLS certificates on 12 internal services, unpatched dependencies in the authentication microservice, and insufficient logging granularity in the payment processing pipeline that could hinder incident response.',
    category: 'Technical',
  },
  {
    title: 'Customer Satisfaction Survey',
    summary: 'Annual survey of 2,400 respondents shows overall satisfaction score of 8.7/10, up from 8.1 last year. Net Promoter Score improved to 62. Key themes: improved onboarding experience, faster support response times, and desire for more integrations with third-party tools.',
    category: 'Customer',
  },
];

const mixedObject = {
  report_name: 'Annual Operations Summary',
  report_date: '2026-01-15',
  department: 'Engineering',
  total_projects: 8,
  team_members: [
    { name: 'Alice', role: 'Lead', hours: 160 },
    { name: 'Bob', role: 'Dev', hours: 145 },
    { name: 'Carol', role: 'Dev', hours: 155 },
  ],
  incidents: [
    {
      title: 'Database Outage',
      description: 'Primary database experienced 45-minute outage due to connection pool exhaustion under peak load. Root cause identified as missing connection timeout configuration. Fixed by adjusting pool settings and adding monitoring alerts for connection count thresholds.',
    },
    {
      title: 'API Rate Limiting',
      description: 'Implemented rate limiting on public API endpoints after detecting abuse patterns from a single IP range. Applied tiered limits: 100 req/min for anonymous, 1000 req/min for authenticated, unlimited for enterprise. No customer impact reported.',
    },
  ],
  _internal_id: 'ops-2026',
  created_at: '2026-01-15T10:00:00Z',
};

// ============================================================
// Tests
// ============================================================

describe('isSystemField', () => {
  test('detects underscore-prefixed keys', () => {
    expect(isSystemField('_id')).toBe(true);
    expect(isSystemField('__v')).toBe(true);
  });

  test('detects standard system fields', () => {
    expect(isSystemField('id')).toBe(true);
    expect(isSystemField('uuid')).toBe(true);
    expect(isSystemField('created_at')).toBe(true);
    expect(isSystemField('updated_at')).toBe(true);
    expect(isSystemField('modified_by')).toBe(true);
    expect(isSystemField('docstatus')).toBe(true);
    expect(isSystemField('parent')).toBe(true);
    expect(isSystemField('parentfield')).toBe(true);
    expect(isSystemField('parenttype')).toBe(true);
  });

  test('does not flag normal fields', () => {
    expect(isSystemField('name')).toBe(false);
    expect(isSystemField('title')).toBe(false);
    expect(isSystemField('description')).toBe(false);
    expect(isSystemField('revenue')).toBe(false);
  });
});

describe('isUuidValue', () => {
  test('detects valid UUIDs', () => {
    expect(isUuidValue('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isUuidValue('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  test('rejects non-UUID strings', () => {
    expect(isUuidValue('hello')).toBe(false);
    expect(isUuidValue('123')).toBe(false);
    expect(isUuidValue('550e8400-e29b-41d4-a716')).toBe(false);
    expect(isUuidValue('not-a-uuid')).toBe(false);
  });

  test('rejects non-strings', () => {
    expect(isUuidValue(12345)).toBe(false);
    expect(isUuidValue(null)).toBe(false);
    expect(isUuidValue(undefined)).toBe(false);
  });
});

describe('classifyJson — flat record', () => {
  test('produces definition-list for scalar key-value pairs', () => {
    const result = classifyJson(flatRecord);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].classification.type).toBe('definition-list');
    expect(result.blocks[0].classification.pairs).toHaveLength(5);

    const pairs = result.blocks[0].classification.pairs;
    expect(pairs[0][0]).toBe('company_name');
    expect(pairs[0][1]).toBe('Acme Corp');
  });

  test('infers title from first identifiable scalar', () => {
    const result = classifyJson(flatRecord);
    expect(result.title).toBe('Acme Corp');
  });
});

describe('classifyJson — nested object', () => {
  test('produces section blocks for nested objects', () => {
    const result = classifyJson(nestedObject);

    const types = result.blocks.map(b => b.classification.type);
    expect(types).toContain('section');
    expect(types).toContain('definition-list');
  });

  test('strips UUID values as noise', () => {
    const data = {
      name: 'Test',
      trace_id: '550e8400-e29b-41d4-a716-446655440000',
    };
    const result = classifyJson(data);
    const allPairs = result.blocks
      .filter(b => b.classification.type === 'definition-list')
      .flatMap(b => b.classification.pairs);
    expect(allPairs.every(([k]) => k !== 'trace_id')).toBe(true);
  });
});

describe('classifyJson — array of short uniform records (table)', () => {
  test('produces table for array of objects with short values', () => {
    const result = classifyJson(shortUniformRecords);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].classification.type).toBe('table');
    expect(result.blocks[0].classification.data).toHaveLength(4);
    expect(result.blocks[0].classification.columns).toEqual(
      expect.arrayContaining(['name', 'role', 'department'])
    );
  });
});

describe('classifyJson — array of long-text records (list)', () => {
  test('produces longtext-list for arrays with long text fields', () => {
    const result = classifyJson(longTextRecords);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].classification.type).toBe('longtext-list');
    expect(result.blocks[0].classification.data).toHaveLength(3);
    expect(result.blocks[0].classification.headingKey).toBe('title');
    expect(result.blocks[0].classification.bodyKey).toBe('summary');
  });
});

describe('classifyJson — mixed object', () => {
  test('handles flat scalars, table array, and longtext-list array together', () => {
    const result = classifyJson(mixedObject);

    const types = result.blocks.map(b => b.classification.type);

    // Should have definition-list for scalars
    expect(types).toContain('definition-list');
    // Should have table for team_members
    expect(types).toContain('table');
    // Should have longtext-list for incidents
    expect(types).toContain('longtext-list');

    // Noise fields should be stripped
    const allPairs = result.blocks
      .filter(b => b.classification.type === 'definition-list')
      .flatMap(b => b.classification.pairs);
    expect(allPairs.every(([k]) => k !== '_internal_id')).toBe(true);
    expect(allPairs.every(([k]) => k !== 'created_at')).toBe(true);

    // Title should be inferred from identifiable scalar
    expect(result.title).toBe('Annual Operations Summary');
  });
});

describe('classifyJson — edge cases', () => {
  test('handles null/undefined', () => {
    expect(classifyJson(null).blocks).toEqual([]);
    expect(classifyJson(undefined).blocks).toEqual([]);
  });

  test('handles empty objects and arrays', () => {
    expect(classifyJson({}).blocks).toEqual([]);
    expect(classifyJson([]).blocks).toEqual([]);
  });

  test('handles scalar value (non-object)', () => {
    const result = classifyJson('just a string');
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].classification.type).toBe('scalar');
  });
});
