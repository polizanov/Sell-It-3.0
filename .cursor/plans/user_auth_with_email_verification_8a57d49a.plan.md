---
name: user_auth_with_email_verification
overview: Implement full user authentication (register/login) with email confirmation via Gmail SMTP, plus frontend login/register + verification flow, integrated into the existing Express+Mongo backend and React Router frontend.
todos:
  - id: backend-user-model
    content: Create Mongoose `User` model with password hash + email verification token fields (plus username + profile image URL fields for later profile management).
    status: completed
  - id: backend-auth-routes
    content: "Add auth routes/controllers/services in `backend/src/routes/auth.routes.ts`: register, login, me, verify-email, resend-verification. Mount `authRoutes` in `backend/src/app.ts`."
    status: completed
  - id: backend-email-service
    content: Add Nodemailer Gmail SMTP email service + env vars and send verification link emails.
    status: completed
  - id: backend-jwt-middleware
    content: Implement JWT utilities + `authenticate` middleware and use it on protected endpoints.
    status: completed
  - id: frontend-auth-ui
    content: Implement Login/Register forms and add VerifyEmail page/route.
    status: completed
  - id: frontend-auth-state
    content: Add `AuthContext`, token persistence, and a fetch-based API wrapper that attaches Authorization header.
    status: completed
  - id: frontend-protection-gating
    content: Add ProtectedRoute and gate verified-only actions (e.g. create product), including resend verification CTA.
    status: completed
  - id: tests
    content: Add backend endpoint tests and frontend route/component tests for auth + verification flow.
    status: completed
isProject: false
---

## Goals

- Add **register/login** with JWT auth.
- Add **email confirmation** after register using a **verification link**.
- Use **Gmail SMTP (App Password)** to send verification emails.
- Allow login before verification, but **restrict protected actions** (and expose `isEmailVerified` so frontend can gate UI).

## Current codebase facts (integration points)

- **Backend**: Express + Mongo/Mongoose. There is a stub register endpoint hardcoded in `backend/src/app.ts`.

```29:46:/Users/d.polizanov/Documents/Projects/sellit-cursor/backend/src/app.ts
  // Example validated endpoint (placeholder for future auth module)
  app.post(
    '/api/auth/register',
    [
      body('email').isEmail().withMessage('Valid email is required'),
      body('password')
        .isString()
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
    ],
    validateRequest,
    (req: express.Request, res: express.Response) => {
      res.status(201).json({
        message: 'Registered (stub)',
        email: req.body.email
      });
    }
  );
```

- **Frontend**: React Router already has `/login` and `/register` routes; Axios client exists in `frontend/src/services/api.ts`.

```13:25:/Users/d.polizanov/Documents/Projects/sellit-cursor/frontend/src/main.tsx
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'profile', element: <Profile /> },
      { path: 'products', element: <AllProducts /> },
      { path: 'products/create', element: <CreateProduct /> },
    ],
  },
])
```

## Backend design

### Data model

Create `backend/src/models/User.ts` (Mongoose) with:

- `email` (unique, lowercased, required)
- `username` (optional for now; managed later)
- `profileImageUrl` (optional for now; managed later)
- `passwordHash` (required)
- `isEmailVerified` (boolean, default `false`)
- `emailVerificationTokenHash` (nullable)
- `emailVerificationTokenExpiresAt` (nullable)
- timestamps

Token security: store only a **hash** of the verification token (not the raw token). Raw token is only sent via email link.

### Auth endpoints

Create `backend/src/routes/auth.routes.ts` and `backend/src/controllers/auth.controller.ts`:

- `POST /api/auth/register`
  - Validate email/password
  - If user exists: return 409
  - Hash password (`bcryptjs`)
  - Generate verification token (random), store token hash + expiry (e.g. 24h)
  - Send verification email via Gmail SMTP
  - Return 201 with `{ user: { email, isEmailVerified }, token: <jwt> }` (JWT allows immediate login)
- `POST /api/auth/login`
  - Validate email/password
  - Check password
  - Return `{ user: { email, isEmailVerified }, token: <jwt> }`
- `GET /api/auth/me` (protected)
  - Return current user `{ email, isEmailVerified }`
- `GET /api/auth/verify-email?token=...` (or `POST` with token in body)
  - Hash provided token
  - Find user with matching token hash + not expired
  - Mark verified; clear token fields
  - Return success + (optionally) fresh JWT
- `POST /api/auth/resend-verification`
  - Requires auth or accepts email (choose one; recommendation: **authenticated**)
  - If already verified: 200
  - Generate new token, email it

### JWT + middleware

Create:

- `backend/src/utils/jwt.ts` for sign/verify and payload typing (`sub` = userId)
- `backend/src/middleware/authenticate.ts` to read `Authorization: Bearer <token>` and attach `req.user`

### Email service (Gmail)

Add `backend/src/services/email.service.ts` using `nodemailer`.

- SMTP: `smtp.gmail.com`, port 587 (STARTTLS)
- Uses **Gmail App Password** (not your normal password)

Build verification link using a configurable frontend origin, e.g.:

- `FRONTEND_ORIGIN=http://localhost:5173`
- Link: `${FRONTEND_ORIGIN}/verify-email?token=${token}`

### Wire into existing app

Update `backend/src/app.ts` to remove the inline stub and instead:

- `app.use('/api/auth', authRoutes)`

Requirement: **All authentication endpoints** (register/login/me/verify-email/resend-verification) must live in `backend/src/routes/auth.routes.ts` and be mounted under `/api/auth` from `backend/src/app.ts` (no inline auth endpoints in `app.ts`).

### Env vars

Extend `backend/.env.example` with:

- `FRONTEND_ORIGIN=http://localhost:5173`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER=your_gmail@gmail.com`
- `SMTP_PASS=your_gmail_app_password`
- `EMAIL_FROM=SellIt <your_gmail@gmail.com>`
- `EMAIL_VERIFY_TOKEN_TTL_MINUTES=1440` (optional)
- `JWT_EXPIRES_IN=7d` (optional)

## Frontend design

### Routes/pages

Add a verification landing page:

- Create `frontend/src/pages/VerifyEmail.tsx`
- Add route `verify-email` in `frontend/src/main.tsx`
- On mount: read `token` from query string, call backend verify endpoint
- Show success/error states + CTA to go to Profile/Home

Implement real forms for:

- `frontend/src/pages/Register.tsx` (email, password)
- `frontend/src/pages/Login.tsx`

### Auth state + API integration

Create:

- `frontend/src/contexts/AuthContext.tsx`
  - Stores `token` + `user` (`email`, `isEmailVerified`)
  - Persists token in `localStorage`
  - Provides `register`, `login`, `logout`, `refreshMe`

Use `**fetch**` for all API requests (no Axios).\n+\nCreate a small wrapper (e.g. `frontend/src/services/http.ts`) to:\n+- Prefix relative paths (use Vite proxy for `/api/*` in dev)\n+- Attach `Authorization: Bearer <token>` when available\n+- Normalize JSON error responses for UI\n+\nUpdate usages (including `Home` and auth pages) to use this wrapper.

### Protected routes + verified gating

- Add `frontend/src/components/ProtectedRoute.tsx` to guard `/profile` and product creation.
- For actions requiring verified email (per your policy “allow limited”):
  - Guard `products/create` behind `isEmailVerified` (UI message + “Resend verification email” button).

### Styling

- Reuse existing `globals.css` / token classes.
- Keep class naming consistent with existing conventions (and rem-based sizing).

## Testing

- **Backend**: add request-level tests for auth endpoints (register/login/verify/resend) with an in-memory Mongo or test database.
- **Frontend**: add route tests for:
  - Register success shows “check your email”
  - VerifyEmail page handles success/failure
  - ProtectedRoute redirects unauthenticated users

## Rollout checklist

- Add a Gmail **App Password** and set `SMTP_USER` / `SMTP_PASS` in `backend/.env`.
- Ensure `CORS_ORIGIN` remains `http://localhost:5173` for dev.
- Start dev servers and manually test: register → receive email → click link → verified UI updates.

