const request = require('supertest');
const app = require('../service');
if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}
function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('getUser', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);
  const userRes = await request(app).get('/api/user/me').set('Authorization', `Bearer ${loginRes.body.token}`);
  //console.log(userRes.body)
  expect(testUser.email).toEqual(userRes.body.email)
});
test('updateUser', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);
  const userRes = await request(app).get('/api/user/me').set('Authorization', `Bearer ${loginRes.body.token}`);
  //console.log(userRes.body)
  expect(userRes.body.email).toEqual(testUser.email)

  const updateRes = await request(app).put(`/api/user/${userRes.body.id}`).set('Authorization', `Bearer ${loginRes.body.token}`).send({
    'name': "test",
    'email': "test@jwt.com",
    'password': "test"
    });;
    console.log(updateRes.body)
    const userRes2 = await request(app).get('/api/user/me').set('Authorization', `Bearer ${updateRes.body.token}`);
    expect(userRes2.body.email).toEqual('test@jwt.com')
});