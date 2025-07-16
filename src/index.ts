import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { readdir, readFileSync } from 'fs'
import mongoose from 'mongoose'
import 'dotenv/config'
import { user } from './models/user.js'
import bcrypt from 'bcrypt'


export const connectDB = async () => {
  try {
    if (!(process.env.MONGODB_URL)) {
      return 'not connected'
    }
    await mongoose.connect(process.env.MONGODB_URL) 
    console.log('✅ MongoDB connected')
  } catch (err) {
    console.error('❌ MongoDB connection error:', err)
  }
}


connectDB()

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

app.post('/signin', async (c) => {
  const body = await c.req.parseBody()
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    const html = readFileSync(join(__dirname, 'views', 'login.html'), 'utf-8')
    const htmlWithError = html.replace('<!--ERROR-->', `
      <p class="text-red-500 text-sm mb-4 text-center">Email and password are required</p>
    `)
    return c.html(htmlWithError)
  }

  const foundUser = await user.findOne({ email })
  if (!foundUser) {
    // User not found, redirect to login with error
    const html = readFileSync(join(__dirname, 'views', 'login.html'), 'utf-8')
    const htmlWithError = html.replace('<!--ERROR-->', `
      <p class="text-red-500 text-sm mb-4 text-center">Invalid email or password</p>
    `)
    return c.html(htmlWithError)
  }
  const isMatch = await bcrypt.compare(password, foundUser.password)
  if (!isMatch) {
    // Password does not match, redirect to login with error
    const html = readFileSync(join(__dirname, 'views', 'login.html'), 'utf-8')
    const htmlWithError = html.replace('<!--ERROR-->', `
      <p class="text-red-500 text-sm mb-4 text-center">Invalid email or password</p>
    `)
    return c.html(htmlWithError)
  }
  // Password matches, redirect to todo
  return c.redirect('/todo')
})

app.post('/signup', async (c) => {
  const body = await c.req.parseBody()
  const email = body.email
  const password = body.password
  const name = body.name
  const confirmPassword = body['confirm-password']
  if (password !== confirmPassword) {
    const html = readFileSync(join(__dirname, 'views', 'signup.html'), 'utf-8')
    const htmlWithError = html.replace('<!--ERROR-->', `
      <p class="text-red-500 text-sm mb-4 text-center">Passwords do not match, please make sure password and confirm password are the same</p>
    `)

    return c.html(htmlWithError)
  }
  await user.create({
    email,
    fullName: name,
    password: password
  })
  return c.redirect('/todo')
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
