import { api } from '../../test-data';
import { test, expect } from '../../src/fixtures';

test.describe('Posts API (service objects)', () => {
  test('GET /posts/:id returns JSON', async ({ postsApi }) => {
    const response = await postsApi.getById(api.posts.validPostId);
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toMatch(/application\/json/);

    const body = await response.json();
    expect(body).toMatchObject({
      id: api.posts.validPostId,
      userId: expect.any(Number),
      title: expect.any(String),
      body: expect.any(String),
    });
  });
});
