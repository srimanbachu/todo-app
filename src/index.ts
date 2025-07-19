import { serve } from '@hono/node-server'
import { readFileSync } from 'fs'
import { Hono } from 'hono'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { connectDB } from './lib/utilits'
import { User as UserModel } from './models/user'
import { Todo } from './models/todo'
import 'dotenv/config'
import { hash, compare } from 'bcrypt'
import { sign, verify } from 'hono/jwt'
connectDB()


interface Variables {
  userid?: string
}



const app = new Hono<{ Variables: Variables }>()
const __dirname = dirname(fileURLToPath(import.meta.url))



// Authentication middleware
const authMiddleware = async (c: any, next: any) => {
  const headers = c.req.header()
  const cookies = headers.cookie
  
  console.log('All headers:', headers)
  console.log('Cookies:', cookies)
  
  if (!cookies) {
    console.log('No cookies found')
    return c.redirect('/login')
  }
  
  // Parse cookies properly
  const cookiePairs = cookies.split(';').map((pair: string) => pair.trim())
  console.log('Cookie pairs:', cookiePairs)
  
  const tokenCookie = cookiePairs.find((pair: string) => pair.startsWith('token='))
  console.log('Token cookie found:', tokenCookie)
  
  if (!tokenCookie) {
    console.log('No token cookie found')
    return c.redirect('/login')
  }
  
  const token = tokenCookie.split('=')[1]
  console.log('Extracted token:', token)

  if (!token) {
    console.log('Token is empty')
    return c.redirect('/login')
  }

  try {
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET)
    const decoded = await verify(token, process.env.JWT_SECRET!) // Verify token
    console.log('Decoded token:', decoded)
    const userId = (decoded as any).id
    console.log('Decoded userId:', userId)
    c.set('userid', userId as string)
  } catch (error) {
    console.log('Token verification error:', error)
    return c.text('Forbidden: Invalid or expired token', 403) // Invalid token
  }

  console.log(`[${c.req.method}] ${c.req.url}`)
  return await next()
}

// Apply middleware to all routes except login and signup
app.use('*', async (c, next) => {
  const url = c.req.url
  console.log('Request URL:', url)
  
  // Skip authentication for login and signup routes
  if (url.includes('/login') || url.includes('/signup') || url === '/') {
    return await next()
  }
  
  // Apply authentication middleware
  return await authMiddleware(c, next)
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
    return c.html(html)
  }

  // 2. Compare password
  const isPasswordValid = await compare(password, user.password)
  if (!isPasswordValid) {
    const filePath = join(__dirname, 'views', 'login.html')
    const html = readFileSync(filePath, 'utf-8').replace('<!--ERROR-->', `
      <p class="text-red-500 text-sm mb-4 text-center">The password you entered is incorrect. Please try again with the correct password</p>
    `)
    return c.html(html)
  }

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

app.post('/todo', async (c) => {
  const body = await c.req.parseBody()
  const userId = c.get('userid')

  try {
    const todo = await Todo.create({
      task: body.title,
      userId: userId
    })
    return c.json(todo)
  } catch (error) { 
    console.log(error)
    return c.json({ error: 'Failed to create todo' }, 500)
  }
})

// Get all todos for the user
app.get('/api/todos', async (c) => {
  console.log('API route called: /api/todos')
  const userId = c.get('userid')
  console.log('userId from context:', userId)

  if (!userId) {
    console.log('No userId found in context')
    return c.json({ error: 'Unauthorized' }, 401)
  }
  
  try {
    const todos = await Todo.find({ userId }).sort({ createdAt: -1 })
    console.log('Found todos:', todos.length)
    return c.json(todos)
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Failed to fetch todos' }, 500)
  }
})

// Complete/uncomplete a todo
app.patch('/api/todos/:id', async (c) => {
  const userId = c.get('userid')
  const todoId = c.req.param('id')
  const body = await c.req.json()
  
  try {
    const todo = await Todo.findOneAndUpdate(
      { _id: todoId, userId },
      { completed: body.completed },
      { new: true }
    )
    
    if (!todo) {
      return c.json({ error: 'Todo not found' }, 404)
    }
    
    return c.json(todo)
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Failed to update todo' }, 500)
  }
})

// Delete a todo
app.delete('/api/todos/:id', async (c) => {
  const userId = c.get('userid')
  const todoId = c.req.param('id')
  
  try {
    const todo = await Todo.findOneAndDelete({ _id: todoId, userId })
    
    if (!todo) {
      return c.json({ error: 'Todo not found' }, 404)
    }
    
    return c.json({ message: 'Todo deleted successfully' })
  } catch (error) {
    console.log(error)
    return c.json({ error: 'Failed to delete todo' }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: 1212,
})
