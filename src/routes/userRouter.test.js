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
    //console.log(updateRes.body)
    const userRes2 = await request(app).get('/api/user/me').set('Authorization', `Bearer ${updateRes.body.token}`);
    expect(userRes2.body.email).toEqual('test@jwt.com')
});
test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});

test('list users', async () => {
  const [user, userToken] = await registerUser(request(app));
  //console.log(user)
  const listUsersRes = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + userToken);
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body.users.length).toBeGreaterThan(0);
  const name = user.name;
  const listUsersRes2 = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + userToken)
    .query({
      'name': name,
});
  //console.log(listUsersRes2.body)
  //console.log(listUsersRes.body.users)
  expect(listUsersRes2.status).toBe(200);
  expect(listUsersRes2.body.users[0].name).toBe(name)
  
});

test('delete user', async () => {
  const [user, userToken] = await registerUser(request(app));
  //console.log(user)
  const deleteRes = await request(app)
    .delete(`/api/user/${user.id}`)
    .set('Authorization', 'Bearer ' + userToken);
  //console.log(deleteRes);
  expect(deleteRes.status).toBe(200);
});

async function registerUser(service) {
  const testUser = {
    name: randomName(),
    email: `${randomName()}@test.com`,
    password: 'a',
  };
  const registerRes = await service.post('/api/auth').send(testUser);
  registerRes.body.user.password = testUser.password;

  return [registerRes.body.user, registerRes.body.token];
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}