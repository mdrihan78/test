const request = require('supertest');
const createApp = require('./app');

let api;
beforeEach(() => { api = request(createApp()); }); // brand new empty app for every test

const newStudent = async (name = 'Rafi') => (await api.post('/students').send({ name })).body;
const newCourse = async (seats = 1) => (await api.post('/courses').send({ title: 'Web Tech', seats })).body;

test('student: create, read, update, delete', async () => {
  const s = await newStudent();
  expect((await api.get('/students/' + s.id)).body.name).toBe('Rafi');
  expect((await api.put('/students/' + s.id).send({ name: 'New' })).body.name).toBe('New');
  expect((await api.delete('/students/' + s.id)).status).toBe(204);
  expect((await api.get('/students/' + s.id)).status).toBe(404);
});

test('course: create, read, update, delete', async () => {
  const c = await newCourse(3);
  expect(c.seatsLeft).toBe(3);
  expect((await api.put('/courses/' + c.id).send({ title: 'DB', seats: 5 })).body.title).toBe('DB');
  expect((await api.delete('/courses/' + c.id)).status).toBe(204);
  expect((await api.get('/courses/' + c.id)).status).toBe(404);
});

test('bad data gives 400', async () => {
  expect((await api.post('/students').send({})).status).toBe(400);
  expect((await api.post('/courses').send({ title: 'X', seats: -5 })).status).toBe(400);
});

test('join a course uses a seat, leaving gives it back', async () => {
  const s = await newStudent(); const c = await newCourse(2);
  const e = await api.post('/enrollments').send({ studentId: s.id, courseId: c.id });
  expect(e.status).toBe(201);
  expect((await api.get('/courses/' + c.id)).body.seatsLeft).toBe(1);
  await api.delete('/enrollments/' + e.body.id);
  expect((await api.get('/courses/' + c.id)).body.seatsLeft).toBe(2);
});

test('full course and double join are refused', async () => {
  const a = await newStudent('A'); const b = await newStudent('B'); const c = await newCourse(1);
  await api.post('/enrollments').send({ studentId: a.id, courseId: c.id });
  expect((await api.post('/enrollments').send({ studentId: a.id, courseId: c.id })).status).toBe(409); // already enrolled
  expect((await api.post('/enrollments').send({ studentId: b.id, courseId: c.id })).status).toBe(409); // full
});

test('unknown student or course gives 404', async () => {
  const c = await newCourse();
  expect((await api.post('/enrollments').send({ studentId: 999, courseId: c.id })).status).toBe(404);
});

test('unknown URL gives 404 json error', async () => {
  const res = await api.get('/nothing-here');
  expect(res.status).toBe(404);
  expect(res.body.error).toBe('route not found');
});
