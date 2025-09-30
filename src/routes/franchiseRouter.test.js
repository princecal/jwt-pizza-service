const request = require('supertest');
const app = require('../service');
if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}
function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}
function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

const testUser = { name: 'pizza franchisee', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let testUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
  expectValidJwt(testUserAuthToken);
});

test('getFranchises', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
  
  const franchiseRes = await request(app).get('/api/franchise');
  expect(franchiseRes.status).toBe(200);
  //expect(franchiseRes.body).toEqual({"franchises": [{"id": 1, "name": "pizzaPocket", "stores": [{"id": 1, "name": "SLC"}]}], "more": false})
  expect(franchiseRes.body.franchises).toBeDefined();
  //console.log(franchiseRes.body);
});
test('deleteFranchise', async () => {
  const admin = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(admin);


  const name = randomName();
  const toSend = {"user": admin,"name": name, "franchisee": [{"email": "f@jwt.com"}], 'admins': [{'email': testUser.email }]}

  const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${loginRes.body.token}`).send(toSend);
  //console.log(createRes.body)
  const postRes = await request(app).get(`/api/franchise/${testUserId}`).set('Authorization', `Bearer ${loginRes.body.token}`);
  //console.log(postRes.body)
  expect(postRes.body).toBeDefined();

  //const deleteRes = 
  await request(app).delete(`/api/franchise/${createRes.body.id}`).set('Authorization', `Bearer ${loginRes.body.token}`);
  //console.log(deleteRes.body)

  const postRes2 = await request(app).get(`/api/franchise/${testUserId}`).set('Authorization', `Bearer ${loginRes.body.token}`);
  //console.log(postRes2.body)
  expect(postRes2.body).toEqual([]);

  
});
test('createFranchise', async () => {
  const admin = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(admin);


  const name = randomName();
  const toSend = {"user": admin,"name": name, "franchisee": [{"email": "f@jwt.com"}], 'admins': [{'email': testUser.email }]}

  //const createRes = 
  await request(app).post('/api/franchise').set('Authorization', `Bearer ${loginRes.body.token}`).send(toSend);
  //console.log(createRes.body)
  const postRes = await request(app).get(`/api/franchise/${testUserId}`).set('Authorization', `Bearer ${loginRes.body.token}`);
  //console.log(postRes.body)
  expect(postRes.body).toBeDefined();

});

test('createStore', async () => {
  const admin = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(admin);


  const name = randomName();
  const toSend = {"user": admin,"name": name, "franchisee": [{"email": "f@jwt.com"}], 'admins': [{'email': testUser.email }]}

  const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${loginRes.body.token}`).send(toSend);
  //console.log(createRes.body)
  const postRes = await request(app).get(`/api/franchise/${testUserId}`).set('Authorization', `Bearer ${loginRes.body.token}`);
  //console.log(postRes.body)
  expect(postRes.body).toBeDefined();
  const store = {"franchiseId": createRes.body.id, "name":randomName()}
  const storeRes = await request(app).post(`/api/franchise/${createRes.body.id}/store`).set('Authorization', `Bearer ${loginRes.body.token}`).send(store);
  //console.log(storeRes.body);
  expect(storeRes.body.id).toBeDefined();




});

test('deleteStore', async () => {
  const admin = await createAdminUser();
  const loginRes = await request(app).put('/api/auth').send(admin);


  const name = randomName();
  const toSend = {"user": admin,"name": name, "franchisee": [{"email": "f@jwt.com"}], 'admins': [{'email': testUser.email }]}

  const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${loginRes.body.token}`).send(toSend);
  //console.log(createRes.body)
  const postRes = await request(app).get(`/api/franchise/${testUserId}`).set('Authorization', `Bearer ${loginRes.body.token}`);
  //console.log(postRes.body)
  expect(postRes.body).toBeDefined();
  const store = {"franchiseId": createRes.body.id, "name":randomName()}
  const storeRes = await request(app).post(`/api/franchise/${createRes.body.id}/store`).set('Authorization', `Bearer ${loginRes.body.token}`).send(store);
  //console.log(storeRes.body);
  expect(storeRes.body.id).toBeDefined();
  const deleteRes = await request(app).delete(`/api/franchise/${createRes.body.id}/store/${storeRes.body.id}`).set('Authorization', `Bearer ${loginRes.body.token}`);
  expect(deleteRes.body.message).toEqual('store deleted')



});



