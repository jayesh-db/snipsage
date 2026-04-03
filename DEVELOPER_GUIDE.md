# 🧠 SnipSage — Developer Guide for Flutter Developers

> **Who is this for?** You! A Flutter/Dart developer who built this Node.js + TypeScript project and wants to deeply understand every moving piece, pattern, and decision.

---

## Table of Contents

1. [What is SnipSage?](#1-what-is-snipsage)
2. [High-Level Architecture](#2-high-level-architecture)
3. [TypeScript vs Dart — A Quick Comparison](#3-typescript-vs-dart--a-quick-comparison)
4. [Technologies Used (and Why)](#4-technologies-used-and-why)
5. [Project Structure Explained](#5-project-structure-explained)
6. [Configuration Files Deep Dive](#6-configuration-files-deep-dive)
7. [Code Walkthrough — Layer by Layer](#7-code-walkthrough--layer-by-layer)
8. [The RAG Pipeline — The AI Brain](#8-the-rag-pipeline--the-ai-brain)
9. [Chrome Extension Architecture](#9-chrome-extension-architecture)
10. [Dashboard UI](#10-dashboard-ui)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [How to Run & Build](#12-how-to-run--build)
13. [Glossary for Flutter Developers](#13-glossary-for-flutter-developers)

---

## 1. What is SnipSage?

SnipSage is a **Personal Knowledge Assistant** with 3 parts:

| Component | What It Does | Flutter Equivalent |
|---|---|---|
| **Backend Server** (Node.js + TypeScript) | REST API, database, AI processing | Like a Dart backend using `shelf` or `dart_frog` |
| **Chrome Extension** | Captures text from web pages | Like a Flutter plugin/package that captures data |
| **Web Dashboard** | View saved content, chat with AI | Like the Flutter app's UI screens |

**The core idea:** You browse the web → select text → save it to your personal database → later ask AI questions, and it answers **only** from your saved content (not from general internet knowledge).

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR BROWSER                              │
│  ┌──────────────────┐     ┌──────────────────────────────┐      │
│  │ Chrome Extension │     │    Web Dashboard (HTML/JS)    │      │
│  │  (popup + bg)    │     │   Knowledge Base + AI Chat    │      │
│  └────────┬─────────┘     └──────────────┬───────────────┘      │
│           │ HTTP requests                │ HTTP requests         │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NODE.js + EXPRESS SERVER                       │
│                     (TypeScript Backend)                          │
│                                                                  │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────┐   │
│  │ Auth Routes  │  │ Content Routes │  │   Chat Routes      │   │
│  │ /api/auth/*  │  │ /api/content/* │  │   /api/chat/*      │   │
│  └──────┬───────┘  └───────┬────────┘  └─────────┬──────────┘   │
│         │                  │                     │               │
│  ┌──────▼───────┐  ┌──────▼─────────┐  ┌───────▼───────────┐   │
│  │ authService  │  │contentService  │  │   ragService      │   │
│  │ (JWT+bcrypt) │  │(save+embed)    │  │  (RAG pipeline)   │   │
│  └──────┬───────┘  └──────┬─────────┘  └───┬───────┬───────┘   │
│         │                  │                │       │            │
│         │           ┌──────▼──────┐   ┌─────▼───┐   │           │
│         │           │ embedding   │   │ vector  │   │           │
│         │           │ Service     │   │ Store   │   │           │
│         │           │(Gemini API) │   │ Service │   │           │
│         │           └─────────────┘   └─────────┘   │           │
│         │                                           │            │
│  ┌──────▼───────────────────────────────────────────▼──────┐    │
│  │                      MongoDB                             │    │
│  │              (Users + Content collections)               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│                 ┌──────────────────────┐                         │
│                 │   Google Gemini API  │                         │
│                 │  (Embeddings + Chat) │                         │
│                 └──────────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

**Think of it like a Flutter app:**
- **Routes** = Screen navigation (GoRouter routes) — they receive HTTP requests and call services
- **Services** = Repository/Use-case layer — business logic lives here
- **Models** = Data classes / Freezed models — define the shape of data
- **Middleware** = Like a Flutter `NavigatorObserver` — intercepts requests before they reach routes
- **Types** = Like your Dart model classes — TypeScript interfaces define data shapes

---

## 3. TypeScript vs Dart — A Quick Comparison

You already know Dart, so here's how TypeScript maps to concepts you know:

### Syntax Comparison

| Concept | Dart | TypeScript |
|---|---|---|
| **Type annotation** | `String name = "hello";` | `const name: string = "hello";` |
| **Nullable type** | `String? name;` | `name: string \| undefined;` or `name?: string;` |
| **Interface** | `abstract class User { }` | `interface User { }` |
| **Async function** | `Future<String> get()` | `async function get(): Promise<string>` |
| **Arrow function** | `(x) => x * 2` | `(x) => x * 2` ✅ Same! |
| **String interpolation** | `'Hello $name'` | `` `Hello ${name}` `` (backticks!) |
| **Null check operator** | `user!.name` | `user!.name` ✅ Same! |
| **Optional chaining** | `user?.name` | `user?.name` ✅ Same! |
| **Map/Dictionary** | `Map<String, int>` | `Map<string, number>` or `Record<string, number>` |
| **List/Array** | `List<String>` | `string[]` or `Array<string>` |
| **Enum** | `enum Color { red, blue }` | `enum Color { Red, Blue }` |
| **Generics** | `class Box<T> { }` | `class Box<T> { }` ✅ Same! |
| **Import** | `import 'package:foo/foo.dart';` | `import foo from 'foo';` |
| **Named export** | N/A (all public by default) | `export function foo() { }` |
| **Private member** | `_privateField` (underscore) | `private privateField` (keyword) |
| **Constructor** | `User({required this.name});` | `constructor(public name: string) { }` |
| **Spread operator** | `[...list1, ...list2]` | `[...list1, ...list2]` ✅ Same! |
| **Type casting** | `user as Admin` | `user as Admin` ✅ Same! |
| **Package manager** | `pub` (pubspec.yaml) | `npm` (package.json) |

### Key Differences to Remember

```typescript
// 1. Variables: 'const' vs 'let' (no 'var' like Dart's 'var')
const immutable = "can't change";   // Like Dart's 'final'
let mutable = "can change";         // Like Dart's 'var'

// 2. Functions can be standalone (not inside a class!)
export function greet(name: string): string {   // Dart equivalent: top-level function
  return `Hello ${name}`;
}

// 3. 'undefined' vs 'null' — TypeScript has BOTH
let a: string | undefined;  // default for optional params
let b: string | null = null; // explicit null

// 4. Objects are like Dart Maps but with typed keys
const user = { name: "John", age: 25 };  // Like {'name': 'John', 'age': 25} in Dart

// 5. 'import/export' is more flexible
import { Router } from 'express';       // Named import (like Dart's 'show')
import express from 'express';           // Default import
import * as authService from './auth';   // Namespace import (like Dart's prefix)
```

---

## 4. Technologies Used (and Why)

### Backend Dependencies (`dependencies` in package.json)

| Package | What It Does | Why We Use It | Flutter Equivalent |
|---|---|---|---|
| **express** | Web server framework | The most popular Node.js server — handles HTTP requests, routing, middleware. Think of it as the "Flutter" of Node.js backends. | `shelf`, `dart_frog` |
| **mongoose** | MongoDB database driver + ORM | Lets us define schemas (like Freezed models) and interact with MongoDB with type safety. | `drift`, `floor` (for SQLite) |
| **cors** | Cross-Origin Resource Security | The browser blocks requests from different origins by default. CORS middleware allows our extension and dashboard to talk to our server. | Not needed in mobile apps |
| **dotenv** | Loads `.env` file into `process.env` | Keeps secrets (API keys, DB URLs) out of the code. Like Flutter's `--dart-define` or `flutter_dotenv`. | `flutter_dotenv` |
| **jsonwebtoken** (JWT) | Authentication tokens | Creates signed tokens that prove "this user is logged in" without storing sessions on the server. Stateless auth. | `dart_jsonwebtoken` |
| **bcryptjs** | Password hashing | Converts passwords to irreversible hashes (so even if DB is stolen, passwords are safe). | `dbcrypt` |
| **uuid** | Generate unique IDs | Creates random session IDs like `f47ac10b-58cc-4372-a567-0e02b2c3d479`. | `uuid` package in Dart |
| **@langchain/core** | LangChain framework core | Provides the abstraction layer for AI chains — messages, documents, embeddings interfaces. (Explained deeply in Section 8) | No direct equivalent |
| **@langchain/google-genai** | Google Gemini AI integration | Connects LangChain to Google's Gemini model for chat and embeddings. Like a plugin for LangChain. | `google_generative_ai` |
| **@langchain/community** | Community integrations | Extra integrations (vector stores, tools). Brings the memory vector store we use in development. | N/A |

### Dev Dependencies (`devDependencies`)

| Package | What It Does | Why |
|---|---|---|
| **typescript** | TypeScript compiler | Compiles `.ts` → `.js` (like the Dart compiler compiles `.dart` → machine code) |
| **ts-node** | Run TypeScript directly | Skips the compile step during development (like `dart run` without needing to `dart compile` first) |
| **nodemon** | Auto-restart on file change | Like Flutter's hot reload — saves the file, server restarts automatically |
| **@types/\*** | Type definitions | TypeScript needs type info for JS libraries. These are like Dart's `.dart` header files for packages written in plain JS |

---

## 5. Project Structure Explained

```
SnipSage/
├── .env                    # 🔐 Secret config (API keys, DB URL) — like .env in Flutter
├── package.json            # 📦 Dependencies — like pubspec.yaml
├── tsconfig.json           # ⚙️  TypeScript config — like analysis_options.yaml
│
├── src/                    # 🏗️  BACKEND SOURCE CODE (TypeScript)
│   ├── server.ts           # 🚀 Entry point — like main.dart
│   ├── app.ts              # 🌐 Express app setup — like MaterialApp config
│   │
│   ├── types/              # 📐 Type definitions — like your Dart model classes
│   │   └── index.ts        #    All interfaces (IUser, IContent, ChatMessage, etc.)
│   │
│   ├── middleware/          # 🛡️  Request interceptors — like HTTP interceptors in Dio
│   │   └── auth.ts         #    JWT token verification
│   │
│   ├── models/             # 🗃️  Database schemas — like Freezed/Hive TypeAdapters
│   │   ├── User.ts         #    User schema (email, password hash)
│   │   └── Content.ts      #    Content schema (text, URL, embedding vector)
│   │
│   ├── routes/             # 🛣️  API endpoints — like GoRouter routes
│   │   ├── auth.ts         #    POST /signup, POST /login, GET /me
│   │   ├── content.ts      #    POST/GET/DELETE /content
│   │   └── chat.ts         #    POST /chat, GET /chat/history
│   │
│   └── services/           # ⚡ Business logic — like repositories/use-cases
│       ├── authService.ts      # Sign up, log in, generate JWT
│       ├── contentService.ts   # Save content + generate embedding
│       ├── embeddingService.ts # Convert text → number vectors via Gemini
│       ├── vectorStoreService.ts # Similarity search (find relevant content)
│       └── ragService.ts       # THE AI BRAIN — RAG pipeline + Gemini chat
│
├── extension/              # 🧩 CHROME EXTENSION
│   ├── manifest.json       # Extension config (like AndroidManifest.xml)
│   ├── background.js       # Service worker (runs in background)
│   ├── content.js          # Injected into web pages (captures text)
│   ├── popup.html/js/css   # The popup UI when you click the extension icon
│   └── icons/              # Extension icons
│
└── public/                 # 🌍 WEB DASHBOARD (served as static files)
    ├── index.html          # Single-page app (auth + knowledge base + AI chat)
    ├── css/styles.css       # Dashboard styling
    └── js/app.js           # Dashboard logic
```

---

## 6. Configuration Files Deep Dive

### `package.json` → *Like pubspec.yaml*

```jsonc
{
  "name": "snipsage",
  "version": "1.0.0",
  "main": "dist/server.js",       // Entry point for production (compiled JS)

  "scripts": {                     // Like custom scripts in pubspec
    "dev": "npx nodemon --exec npx ts-node src/server.ts",   // Hot-reload dev
    "build": "npx tsc",           // Compile TS → JS (like 'flutter build')
    "start": "node dist/server.js", // Run compiled (like running release APK)
    "typecheck": "npx tsc --noEmit" // Check types without building
  },

  "dependencies": { ... },        // Like 'dependencies:' in pubspec.yaml
  "devDependencies": { ... }      // Like 'dev_dependencies:' in pubspec.yaml
}
```

**Key difference from Flutter:** `npm install` = `flutter pub get`. The packages go into `node_modules/` (like `.dart_tool/`).

### `tsconfig.json` → *Like analysis_options.yaml*

```jsonc
{
  "compilerOptions": {
    "target": "ES2020",           // Output JS version (like minSdkVersion)
    "module": "commonjs",         // Module system (Node.js standard)
    "strict": true,               // Enable all strict checks (like strong linting)
    "esModuleInterop": true,      // Allow mixing import styles
    "outDir": "./dist",           // Where compiled JS goes (like build/)
    "rootDir": "./src",           // Where source TS lives (like lib/)
    "moduleResolution": "node",   // How to find packages in node_modules
    "types": ["node"]             // Auto-include Node.js type definitions
  },
  "include": ["src/**/*"],        // Only compile files in src/
  "exclude": ["node_modules", "dist", "extension", "public"]
}
```

### `.env` → *Like --dart-define flags or flutter_dotenv*

```bash
PORT=3000                    # Server port
MONGODB_URI=mongodb://...    # Database connection string
JWT_SECRET=your-secret-key   # Secret for signing auth tokens
GOOGLE_API_KEY=AIza...       # Gemini API key for AI features
VECTOR_STORE_TYPE=memory     # "memory" for dev, "atlas" for production
```

---

## 7. Code Walkthrough — Layer by Layer

### 7.1 Entry Point: `server.ts` → *Like main.dart*

```typescript
// This is where EVERYTHING starts — like void main() in Flutter

import dotenv from 'dotenv';
dotenv.config();                 // Load .env file FIRST (must be before other imports)

import mongoose from 'mongoose';
import app from './app';

async function startServer(): Promise<void> {
  // Step 1: Connect to MongoDB (like initializing Hive or SQLite in Flutter)
  await mongoose.connect(MONGODB_URI);

  // Step 2: Start listening on port 3000 (like running the Flutter app)
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

// Graceful shutdown — cleanup when you press Ctrl+C
process.on('SIGINT', async () => {
  await mongoose.connection.close();   // Close DB connection (like dispose())
  process.exit(0);
});

startServer();  // Actually start! (like runApp() in Flutter)
```

### 7.2 App Setup: `app.ts` → *Like MaterialApp configuration*

```typescript
const app = express();   // Create the "app" — like MaterialApp()

// MIDDLEWARE (runs on EVERY request, like Dio interceptors)
app.use(cors({...}));              // Allow cross-origin requests
app.use(express.json({ limit: '5mb' }));  // Parse JSON request bodies

// ROUTES (like GoRouter route definitions)
app.use('/api/auth', authRoutes);      // /api/auth/login, /api/auth/signup
app.use('/api/content', contentRoutes); // /api/content (CRUD)
app.use('/api/chat', chatRoutes);      // /api/chat (AI conversation)

// HEALTH CHECK (a simple endpoint to verify the server is alive)
app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'API is running.' });
});

// STATIC FILES (serve the dashboard HTML/CSS/JS)
app.use(express.static(publicPath));  // Like serving assets

// SPA FALLBACK — for any URL that isn't /api/*, serve index.html
// This is how Single Page Apps work — the frontend JS handles routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});
```

**Flutter analogy:** Think of `app.ts` as your `MaterialApp` widget where you configure theme, set up routes, add global error handling, etc.

### 7.3 Types: `types/index.ts` → *Like your Dart model classes*

In Dart you'd write:
```dart
class User {
  final String id;
  final String email;
  final String name;
  User({required this.id, required this.email, required this.name});
}
```

In TypeScript, you use **interfaces** (they compile away to nothing — zero runtime cost):
```typescript
export interface IUser extends Document {   // 'extends Document' = adds MongoDB fields
  _id: Types.ObjectId;      // MongoDB's auto-generated ID (like a UUID)
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;  // Method signature
}

// API payloads (what the client sends)
export interface SignupPayload {
  email: string;
  name: string;
  password: string;
}

// API responses (what the server returns)
export interface ChatResponse {
  reply: string;
  sources: ContentSource[];
  sessionId: string;
}

// Generics! Just like Dart
export interface ApiResponse<T = undefined> {  // Default type = undefined
  success: boolean;
  message: string;
  data?: T;              // '?' means optional (like String? in Dart)
}
```

**Key insight:** TypeScript interfaces are like Dart `abstract class` but lighter. They define the **shape** of data without any implementation.

### 7.4 Middleware: `middleware/auth.ts` → *Like a Dio Interceptor*

```typescript
export const authMiddleware = (req, res, next) => {
  // 1. Extract the token from "Authorization: Bearer <token>" header
  const authHeader = req.headers.authorization;
  const token = authHeader.split(' ')[1];   // Get the part after "Bearer "

  // 2. Verify & decode the JWT token
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

  // 3. Attach the user info to the request object
  req.user = decoded;   // Now all route handlers can access req.user!

  // 4. Continue to the next handler
  next();   // This is like calling 'handler.next(request)' in Dio interceptor
};
```

**Flutter Analogy:**
In Dart with Dio, you'd do:
```dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  },
));
```

This middleware is the **server-side** equivalent — it checks incoming tokens instead of attaching outgoing ones.

### 7.5 Models: `User.ts` & `Content.ts` → *Like Freezed + Hive TypeAdapters*

```typescript
// User.ts — defines the database schema

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],    // Built-in validation
    unique: true,                              // Database-level uniqueness
    match: [/^\S+@\S+\.\S+$/, 'Invalid email'], // Regex validation
  },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
}, {
  timestamps: true,   // Auto-adds createdAt and updatedAt fields
});

// PRE-SAVE HOOK — runs before saving to DB (like a beforeInsert callback)
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();  // Skip if password unchanged
  const salt = await bcrypt.genSalt(12);                // Generate random salt
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);  // Hash it
  next();
});

// INSTANCE METHOD — like adding a method to your Dart model class
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};
```

**What's happening with passwords?**
1. User sends password "hello123"
2. Pre-save hook runs → bcrypt turns it into `$2b$12$LJ3...` (irreversible hash)
3. Database stores the hash, NEVER the plain password
4. On login, `comparePassword("hello123")` hashes the input and compares hashes

### 7.6 Routes: → *Like GoRouter route handlers*

Routes are the **API endpoints** — they receive HTTP requests and call services.

```typescript
// routes/auth.ts

const router = Router();

// POST /api/auth/signup → Create new account
router.post('/signup', async (req, res) => {
  const payload: SignupPayload = req.body;           // Get data from request body
  const result = await authService.signup(payload);  // Call service layer
  res.status(201).json({                             // Send response
    success: true,
    message: 'Account created successfully.',
    data: result,
  });
});

// GET /api/auth/me → Get current user (protected route)
router.get('/me', authMiddleware, async (req, res) => {
  //                ^^^^^^^^^^^^^^ middleware runs FIRST to verify JWT
  const user = await authService.getUserById(req.user.userId);
  res.json({ success: true, data: { user } });
});
```

**The pattern is always:**
1. Define the HTTP method + path (`router.post('/signup', ...)`)
2. Optionally add middleware (`authMiddleware`)
3. Extract data from the request (`req.body`, `req.params`, `req.query`)
4. Call the service layer for business logic
5. Send a JSON response (`res.json(...)`)

**Flutter comparison:** This is like defining a `GoRoute(path: '/signup', builder: ...)` but instead of building a widget, you process data and return JSON.

### 7.7 Services Layer — The Business Logic

#### `authService.ts` → *Sign up, Login, JWT*

```typescript
export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  // 1. Validate input
  if (!email || !name || !password) throw new Error('All fields required.');

  // 2. Check if user exists already
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new Error('Account already exists.');

  // 3. Create user (password gets auto-hashed by the pre-save hook!)
  const user = new User({ email, name, passwordHash: password });
  await user.save();

  // 4. Generate JWT token
  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email },  // Payload
    JWT_SECRET,                                           // Secret key
    { expiresIn: '7d' }                                   // Expiry
  );

  return { token, user: { id, email, name } };
}
```

**What is JWT?**
JWT (JSON Web Token) is like a **signed ticket**. The server creates it at login, the client stores it, and sends it with every request. The server can verify the ticket without storing any session data. Think of it like a cinema ticket — the theatre doesn't need a database of who has tickets; the ticket itself proves you paid.

#### `contentService.ts` → *Save captured web content*

```typescript
export async function saveContent(userId, payload): Promise<IContent> {
  const { text, sourceUrl, pageTitle } = payload;

  // Generate embedding (explained in Section 8!)
  let embedding: number[] = [];
  try {
    embedding = await generateEmbedding(text);  // Text → number vector
  } catch (error) {
    // Still save even if embedding fails — graceful degradation
  }

  const content = new Content({
    userId: new Types.ObjectId(userId),
    text: text.trim(),
    sourceUrl,
    pageTitle,
    embedding,    // The AI-searchable number array
  });

  await content.save();
  invalidateUserCache(userId);  // Clear vector search cache
  return content;
}
```

---

## 8. The RAG Pipeline — The AI Brain

This is the most complex and interesting part. Let's break it down completely.

### What is RAG?

**RAG = Retrieval Augmented Generation**

Imagine you ask a friend a question, but before answering, they:
1. 📚 **Search** through your personal notes to find relevant pages
2. 📖 **Read** those relevant pages
3. 💬 **Answer** your question using ONLY what they found in your notes

That's RAG! The AI doesn't use its general knowledge — it's **grounded** in YOUR data.

```
User asks: "What did I save about React hooks?"
    │
    ▼
┌─────────────────────────────┐
│  STEP 1: RETRIEVAL          │
│  "React hooks" → embedding  │ ← embeddingService.ts
│  → search vector store      │ ← vectorStoreService.ts
│  → find top 5 matches       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  STEP 2: AUGMENTATION       │
│  Build a prompt with:       │ ← ragService.ts
│  - System instructions      │
│  - Found content (context)  │
│  - Chat history             │
│  - User's question          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  STEP 3: GENERATION         │
│  Send to Gemini 2.5 Flash   │ ← @langchain/google-genai
│  → Get AI answer            │
│  → Return with sources      │
└─────────────────────────────┘
```

### Step-by-Step Code Walkthrough

#### Step 0: What are Embeddings?

An **embedding** is a way to represent text as a list of numbers (a vector).

```
"React hooks are great" → [0.12, -0.45, 0.78, 0.33, ..., -0.21]  (768 numbers)
"React useState hook"   → [0.11, -0.44, 0.77, 0.34, ..., -0.20]  (similar numbers!)
"Best pizza recipes"    → [0.89, 0.23, -0.56, 0.11, ..., 0.67]   (very different!)
```

**Why?** Because similar texts produce similar numbers, we can **mathematically find** which saved content is most relevant to a question!

**Dart analogy:** Imagine if you could call `"React hooks".toVector()` and get a `List<double>` that captured the *meaning* of the text.

#### Step 1: Embedding Service (`embeddingService.ts`)

```typescript
// This service talks to Google's Gemini API to convert text → numbers

const embeddingsInstance = new GoogleGenerativeAIEmbeddings({
  apiKey,
  modelName: 'gemini-embedding-001',  // Google's embedding model
});

export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate very long text (the model has a limit, like max SMS length)
  const maxChars = 8000;
  const truncated = text.length > maxChars ? text.substring(0, maxChars) : text;

  // Call Google's API → get back a list of numbers
  const embedding = await model.embedQuery(truncated);
  return embedding;  // [0.12, -0.45, 0.78, ...] — 768 numbers
}
```

#### Step 2: Vector Store Service (`vectorStoreService.ts`)

This stores and searches embeddings. Think of it as a **search engine for meaning**.

```typescript
// Two modes: "memory" (development) and "atlas" (production)

// MEMORY MODE — For local development
async function buildMemoryStoreForUser(userId: string) {
  // 1. Load ALL of the user's content from MongoDB (with embeddings)
  const contents = await Content.find({ userId }).select('+embedding');

  // 2. Create an in-memory search index
  const store = new MemoryVectorStore(embeddings);

  // 3. Add each content item as a searchable "document"
  for (const content of contents) {
    const doc = new Document({
      pageContent: content.text,
      metadata: { sourceUrl, pageTitle, ... },
    });
    // Add with its pre-computed embedding
    store.addVectors([content.embedding], [doc]);
  }

  return store;
}

// SEARCH — Find the most relevant content
async function memorySearch(query, userId, k = 5) {
  const store = await buildMemoryStoreForUser(userId);

  // This is the magic ✨ — it:
  // 1. Converts your query to an embedding
  // 2. Finds the k closest embeddings using cosine similarity
  // 3. Returns the matching documents ranked by relevance
  const results = await store.similaritySearchWithScore(query, k);

  return results.map(([doc, score]) => ({
    content: doc.pageContent,
    metadata: doc.metadata,
    score,  // 0.0 to 1.0 — higher = more relevant
  }));
}
```

**Flutter analogy:** Imagine you have a `List<SavedItem>` and instead of doing `list.where((item) => item.text.contains(query))` (simple string matching), you're finding items whose *meaning* is closest to the query. So searching "React state management" would find content about "useState hook" even though the exact words don't match!

**Caching pattern:**
```typescript
const userStoreCache = new Map<string, { store, lastBuilt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes

// Like a Flutter ValueNotifier with expiry — rebuild the index only if:
// 1. It doesn't exist yet, OR
// 2. It's older than 5 minutes
if (cached && Date.now() - cached.lastBuilt < CACHE_TTL_MS) {
  return cached.store;  // Use cached version
}
```

#### Step 3: RAG Service (`ragService.ts`) — The Orchestrator

This is the **heart of the AI system**. It orchestrates the entire conversation flow.

```typescript
export async function chat(userId, message, sessionId?): Promise<ChatResponse> {

  // ═══════════════════════════════════════════════════
  // STEP 1: RETRIEVE — Find relevant saved content
  // ═══════════════════════════════════════════════════
  const searchResults = await similaritySearch(message, userId, 5);
  // Returns top 5 most relevant saved snippets

  // ═══════════════════════════════════════════════════
  // STEP 2: AUGMENT — Build the prompt with context
  // ═══════════════════════════════════════════════════
  const contextString = buildContextString(searchResults);
  // Formats results as:
  //   --- Source 1: "React Docs" (https://react.dev) ---
  //   Hooks let you use state in functional components...

  const systemPrompt = SYSTEM_PROMPT.replace('{context}', contextString);
  // The system prompt tells the AI:
  // "You are SnipSage AI. ONLY use the provided context. NEVER use
  //  your general knowledge. Cite sources."

  // ═══════════════════════════════════════════════════
  // STEP 3: BUILD CONVERSATION — Add chat history
  // ═══════════════════════════════════════════════════
  const messages = [
    new SystemMessage(systemPrompt),       // "You are SnipSage AI..."
    ...recentHistory,                       // Previous Q&A pairs (last 10)
    new HumanMessage(message),             // Current question
  ];

  // ═══════════════════════════════════════════════════
  // STEP 4: GENERATE — Send to Gemini & get response
  // ═══════════════════════════════════════════════════
  const model = getChatModel();            // Gemini 2.5 Flash
  const response = await model.invoke(messages);

  // ═══════════════════════════════════════════════════
  // STEP 5: RETURN — Package response with sources
  // ═══════════════════════════════════════════════════
  return {
    reply: response.content,               // The AI's answer
    sources: searchResults.map(r => ({     // Which content it used
      pageTitle: r.metadata.pageTitle,
      sourceUrl: r.metadata.sourceUrl,
      snippet: r.content.substring(0, 150),
    })),
    sessionId: session.sessionId,
  };
}
```

**Session Management:**
```typescript
// Sessions track conversation history (like keeping a chat open)
const sessions = new Map<string, ChatSession>();

// Auto-cleanup expired sessions every 10 minutes (1-hour TTL)
setInterval(() => {
  for (const [id, session] of sessions) {
    if (Date.now() - session.createdAt.getTime() > 60 * 60 * 1000) {
      sessions.delete(id);  // Clean up old conversations
    }
  }
}, 10 * 60 * 1000);
```

**Flutter analogy:** This is like a `StreamBuilder` that:
1. Queries a local database on every new message
2. Builds a formatted prompt
3. Calls an API
4. Updates the UI with the response and sources

### What is LangChain?

LangChain is a **framework for building AI applications**. It provides standardized interfaces so you can:
- Swap AI models without changing your code (Gemini ↔ OpenAI ↔ Claude)
- Chain operations together (embed → search → generate)
- Handle message types (System, Human, AI messages)

Think of it as **Provider/Riverpod for AI** — it's not required, but it makes everything more organized and swappable.

---

## 9. Chrome Extension Architecture

### How Browser Extensions Work (Manifest V3)

```
┌──────────────────────────────────────────────────────────────┐
│  CHROME BROWSER                                               │
│                                                               │
│  ┌─────────────────┐      ┌────────────────────────────┐     │
│  │  Web Page        │      │  Popup (popup.html/js/css)  │    │
│  │  (any website)   │      │  Shows when you click the   │    │
│  │                  │      │  extension icon in toolbar   │    │
│  │  content.js      │      └──────────────┬─────────────┘     │
│  │  (injected!)     │                     │                    │
│  └────────┬─────────┘                     │                    │
│           │ messages                      │ messages            │
│           │                               │                    │
│  ┌────────▼───────────────────────────────▼──────────────┐    │
│  │           background.js (Service Worker)                │    │
│  │     Lives in the background, coordinates everything     │    │
│  │     - Creates context menus ("Save to SnipSage")       │    │
│  │     - Makes API calls to our server                    │    │
│  │     - Relays messages between popup ↔ content script   │    │
│  └────────────────────────┬───────────────────────────────┘    │
│                           │ HTTP                               │
└───────────────────────────┼────────────────────────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │  Node.js Server  │
                  │  localhost:3000   │
                  └──────────────────┘
```

### `manifest.json` → *Like AndroidManifest.xml / Info.plist*

```jsonc
{
  "manifest_version": 3,           // Chrome extensions version (like minSdkVersion)
  "permissions": [
    "activeTab",      // Access the current tab's URL/title
    "contextMenus",   // Add items to right-click menu
    "storage"         // Store data locally (like SharedPreferences)
  ],
  "content_scripts": [{
    "matches": ["<all_urls>"],     // Inject content.js on ALL web pages
    "js": ["content.js"]
  }]
}
```

### `background.js` — The Coordinator

```javascript
// Creates right-click "Save to SnipSage" menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'snipsage-save',
    title: 'Save to SnipSage',
    contexts: ['selection'],  // Only show when text is selected
  });
});

// When user clicks "Save to SnipSage":
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { token } = await chrome.storage.local.get('token'); // Get saved JWT

  // POST to our server's /api/content endpoint
  const response = await fetch(`${API_BASE}/content`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,  // Auth with JWT
    },
    body: JSON.stringify({
      text: info.selectionText,    // The selected text
      sourceUrl: tab.url,           // The page URL
      pageTitle: tab.title,         // The page title
    }),
  });
});
```

### `content.js` — Injected Into Every Web Page

```javascript
// This runs inside every web page you visit!
// Its job: listen for messages and reply with selected text

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    sendResponse({
      text: window.getSelection()?.toString() || '',  // Currently selected text
      url: window.location.href,                       // Current URL
      title: document.title,                            // Page title
    });
  }

  if (message.type === 'SNIPSAGE_SAVE_RESULT') {
    showNotification(message.success, message.message);  // Show toast
  }
});
```

**Flutter analogy:** Think of `content.js` like a Flutter `MethodChannel` handler that lives inside each web page. The background (like the Android native side) can call it to get data.

---

## 10. Dashboard UI

The dashboard is a **Single Page Application (SPA)** — one HTML file with JavaScript that dynamically shows different views.

### How it Works

```
public/
├── index.html    ← The one HTML file with ALL views hidden/shown by JS
├── css/styles.css ← All styling (glassmorphism, gradients, animations)
└── js/app.js     ← All logic (auth, content loading, AI chat)
```

**Views inside index.html:**
1. **Auth Page** (`#authPage`) — Login/Signup forms with animated background
2. **Dashboard Page** (`#dashboardPage`) — Two sub-views:
   - **Knowledge Base** (`#knowledgeView`) — Shows saved content with stats
   - **AI Chat** (`#chatView`) — Chat interface with SnipSage AI

**Flutter analogy:** This is like having a `Stack` with `Visibility` widgets controlling which "screen" is active. The `js/app.js` file is like your `StatefulWidget` that manages which view is visible.

---

## 11. Data Flow Diagrams

### Flow 1: User Saves Content (via Chrome Extension)

```
User selects text on a webpage
    │
    ▼
Right-clicks → "Save to SnipSage"
    │
    ▼
background.js catches the event
    │
    ▼
POST /api/content {text, sourceUrl, pageTitle}
    │ (with JWT token in Authorization header)
    ▼
authMiddleware verifies JWT → extracts userId
    │
    ▼
contentRoute receives request → calls contentService.saveContent()
    │
    ▼
contentService:
    ├── Validates the text
    ├── Calls embeddingService.generateEmbedding(text)
    │       └── Sends text to Google Gemini API
    │       └── Gets back [0.12, -0.45, ...] (768 numbers)
    ├── Saves to MongoDB: { userId, text, sourceUrl, pageTitle, embedding }
    └── Invalidates vector store cache for this user
    │
    ▼
Response: { success: true, content: {...} }
    │
    ▼
background.js shows green "✓" badge on extension icon
content.js shows toast notification on the webpage
```

### Flow 2: User Chats with AI (via Dashboard)

```
User types: "What did I save about TypeScript?"
    │
    ▼
POST /api/chat { message: "What did I save about TypeScript?", sessionId }
    │ (with JWT token)
    ▼
authMiddleware verifies JWT
    │
    ▼
chatRoute → calls ragService.chat(userId, message, sessionId)
    │
    ▼
ragService:
    │
    ├── STEP 1: RETRIEVE
    │   └── vectorStoreService.similaritySearch("What about TypeScript?", userId, 5)
    │       ├── Load user's content + embeddings from MongoDB
    │       ├── Build MemoryVectorStore (or use cached)
    │       ├── Convert query to embedding via Gemini API
    │       └── Find top 5 closest vectors (most relevant content)
    │
    ├── STEP 2: AUGMENT
    │   ├── Format found content into context string
    │   ├── Insert into system prompt: "Use ONLY this context..."
    │   └── Build message array: [System, ...ChatHistory, Human]
    │
    ├── STEP 3: GENERATE
    │   └── Send messages to Gemini 2.5 Flash via LangChain
    │       └── Gemini reads the context + question → generates answer
    │
    └── STEP 4: RESPOND
        ├── Extract AI's text reply
        ├── Build sources list from search results
        └── Save to session history
    │
    ▼
Response: {
    reply: "Based on your saved content, here's what you have about TypeScript...",
    sources: [{ pageTitle: "TS Docs", sourceUrl: "...", snippet: "..." }],
    sessionId: "abc-123"
}
```

---

## 12. How to Run & Build

### Prerequisites
- **Node.js** v18+ (the runtime — like the Dart SDK)
- **MongoDB** running locally (the database)
- **Google API Key** for Gemini (in `.env` file)

### Development (Hot Reload)
```bash
npm run dev
# This runs: nodemon --exec ts-node src/server.ts
# nodemon watches files → restarts on change (like Flutter hot reload)
# ts-node runs TypeScript directly without compiling first
```

### Production Build
```bash
npm run build     # Compile TypeScript → JavaScript (into dist/ folder)
npm start         # Run the compiled JavaScript
```

### Type Checking (Without Building)
```bash
npm run typecheck
# Like running 'dart analyze' — checks types without producing output
```

### Install Chrome Extension
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder

---

## 13. Glossary for Flutter Developers

| Node.js/Web Term | Flutter/Dart Equivalent | Explanation |
|---|---|---|
| **npm** | pub | Package manager (`npm install` = `flutter pub get`) |
| **package.json** | pubspec.yaml | Lists dependencies and scripts |
| **node_modules/** | .dart_tool/ | Where installed packages live |
| **Express** | shelf / dart_frog | HTTP server framework |
| **Middleware** | Interceptor (Dio) | Code that runs before/after route handlers |
| **Route** | GoRoute | Maps a URL path to a handler function |
| **REST API** | HTTP endpoints | URL-based interface for data exchange |
| **MongoDB** | SQLite/Hive | Database (but document-based, not SQL) |
| **Mongoose** | drift/floor | Database ORM/ODM with schemas |
| **Schema** | Freezed model | Defines the shape of a database document |
| **JWT** | Auth token | Signed token proving user identity |
| **bcrypt** | - | Password hashing algorithm |
| **CORS** | - | Browser security policy for cross-origin requests |
| **Service Worker** | Platform channel | Background process in Chrome extensions |
| **Content Script** | Injected widget | JavaScript injected into web pages |
| **SPA** | Single-Activity app | One HTML page, JS handles "navigation" |
| **Vector/Embedding** | List\<double\> | Number array representing text meaning |
| **Vector Store** | Search index | Database optimized for nearest-neighbor search |
| **RAG** | - | AI pattern: Retrieve context → Ask AI → Return grounded answer |
| **LangChain** | - | Framework for building AI pipelines |
| **Gemini** | - | Google's AI model for chat and embeddings |
| **process.env** | Platform.environment | Environment variables (configs, secrets) |
| **Promise** | Future | Represents an async computation result |
| **async/await** | async/await | ✅ Works the same way! |
| **Map\<K,V\>** | Map\<K,V\> | ✅ Works the same way! |
| **nodemon** | Hot reload | Auto-restart on file changes |
| **ts-node** | dart run | Run TypeScript directly during development |
| **tsc** | dart compile | Compile TypeScript to JavaScript |
| **dist/** | build/ | Compiled output directory |

---

## 14. New Features — Deep Dive

### 14.1 Full Web Page Capture (Feature 1)

Previously the extension only saved **selected text**. Now you can capture the **entire page**.

#### How It Works — Chrome Extension Side

```
User clicks "📄 Save Full Page" in popup
        │
        ▼
popup.js → sends message → background.js → relays to → content.js
                                                           │
                                                           ▼
                                              extractFullPageText()
                                              1. Clone document.body
                                              2. Remove: <script>, <style>,
                                                 <nav>, <footer>, <header>,
                                                 <aside>, ads, menus
                                              3. Extract innerText
                                              4. Collapse whitespace
                                                           │
                                                           ▼
                                              Return clean text + URL + title
                                                           │
                                                           ▼
popup.js → POST /api/content with captureType: "full-page"
```

#### How It Works — Backend Chunking

Full pages can be **very long** (10,000+ characters). Embedding an entire page as one vector degrades retrieval quality. So we **chunk** it:

```typescript
// contentService.ts — chunkText() algorithm

"A very long page..."
    │
    ▼
Split by paragraph breaks (\n\n)
    │
    ▼
For each paragraph:
  - If adding it would exceed ~1500 chars → start a new chunk
  - If a single paragraph > 1500 chars → split by sentences
  - Keep ~200 chars of overlap between chunks for context continuity
    │
    ▼
Result: ["chunk 0: 1400 chars", "chunk 1: 1350 chars", "chunk 2: 900 chars"]
```

#### Storage Pattern — Parent + Chunks

```
MongoDB "contents" collection:
┌─────────────────────────────────────────────────────┐
│ Parent Record (captureType: "full-page")            │
│ _id: ObjectId("abc123")                             │
│ text: "Full page text... (everything)"              │
│ embedding: []  ← EMPTY (too large to embed as one)  │
│ parentId: undefined                                 │
│ pageTitle: "React Docs"                             │
│ sourceUrl: "https://react.dev/learn"                │
└─────────────────────────────────────────────────────┘
    │
    ├─── Chunk 0: { parentId: "abc123", chunkIndex: 0,
    │              text: "First 1500 chars...",
    │              embedding: [0.12, -0.45, ...] }  ← HAS embedding
    │
    ├─── Chunk 1: { parentId: "abc123", chunkIndex: 1,
    │              text: "Next 1500 chars...",
    │              embedding: [0.33, -0.21, ...] }  ← HAS embedding
    │
    └─── Chunk 2: { parentId: "abc123", chunkIndex: 2,
                   text: "Final 900 chars...",
                   embedding: [0.77, 0.15, ...] }   ← HAS embedding
```

**Key rules:**
- **Parent** = displayed in Knowledge Base UI, stores full text, NO embedding
- **Chunks** = hidden from UI, stores partial text, HAS embedding for search
- **Deleting** the parent cascades → all chunks are deleted too
- **Listing** content excludes chunks (`parentId: { $exists: false }`)

#### New Types Added

```typescript
type CaptureType = 'selection' | 'full-page';

interface IContent extends Document {
  captureType: CaptureType;    // NEW — what kind of capture
  parentId?: Types.ObjectId;   // NEW — link chunk → parent
  chunkIndex?: number;         // NEW — order within parent
  // ... existing fields
}
```

**Dart equivalent:** Like adding a `isFullPage` bool and `parentRef` to your model.

---

### 14.2 Persistent Chat History (Feature 2)

Previously, chat sessions lived **in memory** (lost on server restart). Now they're **persisted in MongoDB**.

#### New MongoDB Collection: `ChatSession`

```typescript
// models/ChatSession.ts

interface IChatSession extends Document {
  userId: Types.ObjectId;         // Who owns this chat
  title: string;                  // Auto-generated from first message
  messages: ChatSessionMessage[]; // Ordered message array
  snippetId?: Types.ObjectId;     // If scoped to a specific snippet
  createdAt: Date;                // Auto by mongoose timestamps
  updatedAt: Date;                // Auto by mongoose timestamps
}

interface ChatSessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: ContentSource[];      // AI responses include source references
}
```

**Dart equivalent:** Like a Hive box storing `ChatSession` objects with a `List<Message>`.

#### New REST API Endpoints

| Method | Endpoint | Purpose | Old System |
|--------|----------|---------|------------|
| `GET` | `/api/chat/history` | List all chat sessions | ❌ Didn't exist |
| `POST` | `/api/chat/session` | Create new session | ❌ Was auto-created |
| `GET` | `/api/chat/session/:id` | Get session + messages | ❌ Didn't exist |
| `PUT` | `/api/chat/session/:id/message` | Send message, get response | Was `POST /api/chat` |
| `DELETE` | `/api/chat/session/:id` | Delete a session | ❌ Didn't exist |

#### Message Flow (New Architecture)

```
Dashboard: User types message
    │
    ├── If no session exists yet:
    │   POST /api/chat/session → creates session, gets sessionId
    │
    ▼
PUT /api/chat/session/:id/message
    │
    ▼ chatSessionService.addMessageAndRespond()
    │
    ├── 1. Load session from MongoDB (verify ownership)
    ├── 2. Auto-set title from first message (first 60 chars)
    ├── 3. Build conversation history from stored messages
    ├── 4. Call ragService.chat(userId, message, history, snippetId?)
    │       │
    │       ├── Vector similarity search (scoped if snippetId)
    │       ├── Build prompt with context + history
    │       └── Invoke Gemini 2.5 Flash
    │
    ├── 5. Append user message + AI response to session.messages
    ├── 6. Save session to MongoDB
    └── 7. Return AI response + sources
```

**Key change:** `ragService.ts` no longer manages sessions. It's now a **pure function** — give it a message + history, get a response. The session management lives in `chatSessionService.ts`.

#### Dashboard UI — Chat History Sidebar

```
┌──────────────────────────────────────────────────────────┐
│ Chat View (split layout)                                   │
│                                                            │
│  ┌────────────────┐  ┌─────────────────────────────────┐  │
│  │ Chat History   │  │  Main Chat Area                  │  │
│  │                │  │                                  │  │
│  │ [+ New Chat]   │  │  ┌──────────────────────────┐   │  │
│  │                │  │  │ 🔒 Scoped to: "React.." │   │  │
│  │ ▸ React hooks  │  │  └──────────────────────────┘   │  │
│  │   Apr 2 · 4msg │  │                                  │  │
│  │                │  │  User: What are hooks?           │  │
│  │ ▸ 🔒 Snippet.. │  │  AI: Based on your saved...     │  │
│  │   Apr 1 · 2msg │  │                                  │  │
│  │                │  │  [Type your message...]          │  │
│  └────────────────┘  └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

### 14.3 Snippet-Specific Chat (Feature 3)

Users can now **chat with a single snippet** instead of their entire knowledge base.

#### How It's Triggered

```
Knowledge Base View:
┌─────────────────────────────────────────────────┐
│ React Hooks Overview          ✂️ Selection       │
│ "Hooks let you use state..."                     │
│ ──────────────────────────────────────────────── │
│ 🌐 react.dev    [💬 Chat] [🗑️ Delete]           │
│                  ^^^^^^^^                        │
│                  Click this!                     │
└─────────────────────────────────────────────────┘
    │
    ▼
1. Creates new ChatSession with snippetId = <this content's _id>
2. Switches to Chat view
3. Shows snippet-scoped banner: "🔒 Scoped to: React Hooks Overview"
4. RAG pipeline filters search to ONLY this snippet's content
```

#### Backend — Snippet-Scoped RAG

The critical change is in `vectorStoreService.ts`:

```typescript
// When snippetId is provided:
async function memorySearch(query, userId, k, snippetId?) {
  const store = await buildMemoryStoreForUser(userId);
  const results = await store.similaritySearchWithScore(query, k * 3);

  if (snippetId) {
    // FILTER: Only keep results where:
    // - contentId === snippetId (it IS the snippet), OR
    // - parentId === snippetId (it's a CHUNK of the snippet)
    filtered = results.filter(([doc]) => {
      return doc.metadata.contentId === snippetId
          || doc.metadata.parentId === snippetId;
    });
  }

  return filtered.slice(0, k);
}
```

And in `ragService.ts`, a dedicated prompt:

```typescript
const SNIPPET_SYSTEM_PROMPT = `
You are in a focused conversation about a SPECIFIC saved snippet.
Answer based ONLY on the following specific saved content.
NEVER use your general knowledge.
...
SPECIFIC SNIPPET CONTENT:
{context}
`;

// Selected based on whether snippetId exists
const promptTemplate = snippetId ? SNIPPET_SYSTEM_PROMPT : GENERAL_SYSTEM_PROMPT;
```

---

### 14.4 Updated Project Structure

```
src/
├── models/
│   ├── User.ts
│   ├── Content.ts         # ← Updated: captureType, parentId, chunkIndex
│   └── ChatSession.ts     # ← NEW: persistent chat sessions
│
├── services/
│   ├── authService.ts
│   ├── contentService.ts  # ← Updated: chunking, cascade delete
│   ├── embeddingService.ts
│   ├── vectorStoreService.ts  # ← Updated: snippet filtering
│   ├── ragService.ts      # ← Updated: pure function, snippet prompts
│   └── chatSessionService.ts  # ← NEW: session CRUD + RAG orchestration
│
├── routes/
│   ├── auth.ts
│   ├── content.ts         # ← Updated: captureType validation
│   └── chat.ts            # ← Rewritten: session-based REST API
│
└── types/
    └── index.ts           # ← Updated: CaptureType, IChatSession, etc.

extension/
├── content.js             # ← Updated: EXTRACT_FULL_PAGE handler
├── background.js          # ← Updated: full-page message relay
├── popup.html             # ← Updated: Save Full Page button
├── popup.js               # ← Updated: full-page capture logic
└── popup.css              # ← Updated: full-page button style

public/
├── index.html             # ← Updated: chat history panel, snippet banner
├── js/app.js              # ← Major update: history, snippet chat, new API
└── css/styles.css          # ← Updated: 300+ new lines of styling
```

---

> **💡 Tip:** The best way to understand this project deeply is to:
> 1. Start the server (`npm run dev`)
> 2. Open the dashboard at `http://localhost:3000`
> 3. Create an account and save some content
> 4. Try saving a full page vs a text selection — observe the chunks in MongoDB
> 5. Start a regular chat, then try a snippet-scoped chat — notice the different responses
> 6. Reload the page — your chat history persists!
> 7. Watch the server's terminal output — you'll see every step happen in real-time

---

*Built with ❤️ using Node.js, TypeScript, LangChain, Google Gemini, MongoDB, and a Chrome Extension.*

