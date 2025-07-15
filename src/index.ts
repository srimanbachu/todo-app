import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
const app = new Hono()


const __dirname = dirname(fileURLToPath(import.meta.url))


app.get('/signup', (c) => {
  const html = readFileSync(join(__dirname, 'views', 'signup.html'), 'utf-8')
  return c.html(html)
})

app.get('/todo', (c) => {
  const html = readFileSync(join(__dirname, 'views', 'todo.html'), 'utf-8')
  return c.html(html)
})

app.get('/login', (c) => {
  const html = readFileSync(join(__dirname, 'views', 'login.html'), 'utf-8')
  return c.html(html)
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get('/hello', (c) => {
  return c.html('<h1>Hello World!</h1>')
})






//http://localhost:4000/calculate?a=5&b=10
//?a=5&b=10

app.get('/calculate', (c) => {

  const a = c.req.query('a')
  const b = c.req.query('b')


  if (!a) {
    return c.json({ 'result': 'a is not found' }, 400)
  }

  if (!b) {
    return c.json({ 'result': 'b is not found' }, 400)
  }

  const sum = Number(a) + Number(b)

  return c.json({ 'result': sum })
})

app.notFound((c) => {
  return c.text('This page dont exist, sorry!', 404)
})

serve({
  fetch: app.fetch,
  port: 4000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
