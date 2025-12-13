import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/db/pool', () => {
  const query = jest.fn();
  const connect = jest.fn().mockResolvedValue({ query, release: jest.fn(), queryCalls: query });
  return { pool: { query, connect } };
});

const { pool } = await import('../src/db/pool');
const svc = await import('../src/modules/projects/project.service');

describe('Project sharing validations', () => {
  beforeEach(() => {
    (pool.query as any).mockReset();
    (pool.connect as any).mockReset();
  });

  test('updateProjectVisibility to shared with no members fails', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'p1' }] }) // select project
      .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // count members
    (pool.connect as any).mockResolvedValue({ query, release: jest.fn() });

    await expect(svc.updateProjectVisibility('p1', 'shared')).rejects.toThrow(/without collaborators/i);
  });
});
