import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-development-only';
const { default: app } = await import('../src/app.js');

test('protected patient routes reject requests without a token', async () => {
  const response = await request(app).get('/api/patients');
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Authentication required.');
});

test('protected patient routes reject malformed or invalid bearer tokens', async () => {
  const response = await request(app).get('/api/patients').set('Authorization', 'Bearer not-a-valid-token');
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Invalid or expired session.');
});

test('protected routes reject expired signed tokens', async () => {
  const expired = jwt.sign({ sub: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
  const response = await request(app).get('/api/patients').set('Authorization', `Bearer ${expired}`);
  assert.equal(response.status, 401);
  assert.equal(response.body.error, 'Invalid or expired session.');
});

test('bootstrap rejects a request with missing required fields before database access', async () => {
  const response = await request(app).post('/api/auth/bootstrap').send({ setupKey: 'incorrect-shape' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, 'Please check the submitted fields.');
});

test('unknown endpoints return a JSON 404', async () => {
  const response = await request(app).get('/api/not-a-route');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Route not found.');
});
