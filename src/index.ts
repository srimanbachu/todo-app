import { serve } from '@hono/node-server'
import { readFileSync } from 'fs'
import { Hono } from 'hono'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './lib/utilits'
import { User as UserModel } from './models/user'
import 'dotenv/config'
import { hash, compare } from 'bcrypt'
import {sign, verify} from 'hono/jwt'
connectDB()



const app = new Hono()
const __dirname = dirname(fileURLToPath(import.meta.url))



app.use('/todo',async (c, next) => {
  const headers = c.req.header()
  const cookies = headers.cookie.split('=')[1]
  const token = cookies
  console.log(token)

  if (!token) {
    return c.redirect('/login')
  }

  try {
    const decoded = verify(token, process.env.JWT_SECRET!) // Verify token
    await next() // Continue to route
  } catch (error) {
    return c.text('Forbidden: Invalid or expired token', 403) // Invalid token
  }

  console.log(`[${c.req.method}] ${c.req.url}`)
  await next()
})

// '/' route
app.get('/', (c) => c.text(''))


// signup route 
app.get('/signup', (c) => {
  const filePath = join(__dirname, 'views', 'signup.html')
  const html = readFileSync(filePath, 'utf-8')
  return c.html(html)
})
//signup endpoint
app.post('/signup', async (c) => {
  const body = await c.req.parseBody()
  console.log(body)
  const email = body.email
  const name = body.name
  const password = body.password
  const confirmPassword = body["confirm-password"]
  if (password !== confirmPassword) {
    const filePath = join(__dirname, 'views', 'signup.html')
    const html = readFileSync(filePath, 'utf-8').replace('<!--ERROR-->', `
      <p class="text-red-500 text-sm mb-4 text-center">Passwords do not match,both password and confirm password should be the same</p>
    `)
    return c.html(html)
  }
  if
    (typeof password !== 'string') {
    return
  }
  const hashedPassword = await hash(password, 10)
  console.log(hashedPassword)

  await UserModel.create({
    email: email,
    name: name,
    password: hashedPassword
  })
  return c.redirect('/todo')


})
// login route
app.get('/login', (c) => {
  const filePath = join(__dirname, 'views', 'login.html')
  const html = readFileSync(filePath, 'utf-8')
  return c.html(html)
})

// login endpoint 
app.post('/login', async (c) => {
  const body = await c.req.parseBody()
  const email = body.email
  const password = body.password

  if (typeof password !== "string") {
    return
  }

  // 1. Find user
  const user = await UserModel.findOne({ email })
  if (!user) {
    const filePath = join(__dirname, 'views', 'login.html')
    const html = readFileSync(filePath, 'utf-8').replace('<!--ERROR-->', `
      <p class="text-red-500 text-sm mb-4 text-center">The email you entered doesn't match any account. If you haven't signed up yet, please create a new account</p>
    `)
    return c.html(html)  }

  // 2. Compare password
  const isPasswordValid = await compare(password, user.password)
  if (!isPasswordValid) {
    const filePath = join(__dirname, 'views', 'login.html')
    const html = readFileSync(filePath, 'utf-8').replace('<!--ERROR-->', `
      <p class="text-red-500 text-sm mb-4 text-center">The password you entered is incorrect. Please try again with the correct password</p>
    `)
    return c.html(html)  }

  // 3. Sign token (JWS)
  const token = await sign(
    {
      id: user._id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 200000000000000 // 1 day expiry
    },
    process.env.JWT_SECRET!
  )

  // 4. ✅ Set cookie with token
  c.header(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=8640000000000; SameSite=Strict`
  )

  // 5. Redirect or send response
  return c.redirect('/todo')
})


// todo route
app.get('/todo', (c) => {
  const filePath = join(__dirname, 'views', 'todo.html')
  const html = readFileSync(filePath, 'utf-8')
  return c.html(html)
})

serve({
  fetch: app.fetch,
  port: 1212,
})