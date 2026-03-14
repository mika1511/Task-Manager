# TaskFlow API — Postman Testing Guide

> Test the full flow in the order listed. Each step builds on the previous one.

---

## Setup: Create an Environment

In Postman, create an **Environment** called `TaskFlow Dev` with these variables:

| Variable | Initial Value |
|----------|--------------|
| `AUTH_URL` | `http://localhost:3000` |
| `TASK_URL` | `http://localhost:4000` |
| `NOTIFY_URL` | `http://localhost:6001` |
| `accessToken` | *(leave blank — auto-filled by step 3)* |
| `userId` | *(leave blank — auto-filled by step 3)* |
| `userId2` | *(leave blank — auto-filled by step 5)* |
| `taskId` | *(leave blank — auto-filled by step 7)* |

---

## Phase 1: Auth Service

### Step 1 — Register User A (the Task Creator)

```
POST {{AUTH_URL}}/api/auth/register
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@test.com",
  "password": "password123"
}
```

**Expected:** `201 Created` → `{ "message": "User created", "user": { "id": "..." } }`

---

### Step 2 — Register User B (the Assignee)

```
POST {{AUTH_URL}}/api/auth/register
Content-Type: application/json

{
  "name": "Bob",
  "email": "bob@test.com",
  "password": "password123"
}
```

---

### Step 3 — Login as Alice (save token)

```
POST {{AUTH_URL}}/api/auth/login
Content-Type: application/json

{
  "email": "alice@test.com",
  "password": "password123"
}
```

**Expected:** `200 OK` → `{ "accessToken": "...", "refreshToken": "..." }`

> In Postman **Tests** tab, paste this to auto-save the token:
> ```javascript
> const body = pm.response.json();
> pm.environment.set("accessToken", body.accessToken);
> ```

---

### Step 4 — Get Current User (smoke test for the bug fix)

```
GET {{AUTH_URL}}/api/auth/user
Authorization: Bearer {{accessToken}}
```

**Expected:** `200 OK` → `{ "id": "...", "name": "Alice", "email": "alice@test.com" }`

> ✅ Previously returned `null` because `userId` was read from the wrong property.

---

### Step 5 — Get All Users (for Assignee dropdown) ✅ NEW

```
GET {{AUTH_URL}}/api/auth/users
Authorization: Bearer {{accessToken}}
```

**Expected:** `200 OK` → array of all users with [id](file:///c:/Users/deshm/Desktop/full_stack/MERN%20Stack/taskflow-api/services/task-service/src/routes/task.routes.ts#8-14), `name`, `email`

> In Postman **Tests** tab, save Bob's ID for later:
> ```javascript
> const users = pm.response.json();
> const bob = users.find(u => u.email === "bob@test.com");
> pm.environment.set("userId2", bob.id);
> ```

---

## Phase 2: Task Service

> All task requests need: `Authorization: Bearer {{accessToken}}`

### Step 6 — Create a Task (assigned to Bob) ✅ assignedTo fix

```
POST {{TASK_URL}}/api/tasks
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "title": "Fix the login page bug",
  "description": "The submit button is broken on mobile",
  "assignedTo": "{{userId2}}"
}
```

**Expected:** `201 Created` → full task object with `createdBy` (Alice's ID) and `assignedTo` (Bob's ID)

> In Postman **Tests** tab:
> ```javascript
> pm.environment.set("taskId", pm.response.json()._id);
> ```

---

### Step 7 — Fetch Tasks Assigned to Me (as Alice)

```
GET {{TASK_URL}}/api/tasks?filter=assignedTo
Authorization: Bearer {{accessToken}}
```

**Expected:** `200 OK` → empty list (Alice assigned the task to Bob, not herself)

---

### Step 8 — Fetch Tasks Created by Me ✅ NEW filter

```
GET {{TASK_URL}}/api/tasks?filter=createdBy
Authorization: Bearer {{accessToken}}
```

**Expected:** The task from Step 6 appears (Alice created it)

---

### Step 9 — Login as Bob and Fetch His Assigned Tasks

**First, login as Bob:**
```
POST {{AUTH_URL}}/api/auth/login
Content-Type: application/json

{ "email": "bob@test.com", "password": "password123" }
```
Save Bob's token as `bobToken` in a variable.

```
GET {{TASK_URL}}/api/tasks?filter=assignedTo
Authorization: Bearer {{bobToken}}
```

**Expected:** The task appears in Bob's list. ✅

---

### Step 10 — Assignee Updates Status (Bob can only update status)

```
PATCH {{TASK_URL}}/api/tasks/{{taskId}}
Authorization: Bearer {{bobToken}}
Content-Type: application/json

{ "status": "inprogress" }
```

**Expected:** `200 OK` — task status updated ✅

---

### Step 11 — Assignee Tries to Delete (Must Fail) ✅ Security fix

```
DELETE {{TASK_URL}}/api/tasks/{{taskId}}
Authorization: Bearer {{bobToken}}
```

**Expected:** `403 Forbidden` → `"only the creator can delete this task"` ✅

---

### Step 12 — Creator Deletes the Task (Alice)

```
DELETE {{TASK_URL}}/api/tasks/{{taskId}}
Authorization: Bearer {{accessToken}}
```

**Expected:** `204 No Content` ✅

---

## Phase 3: Real-Time Notifications (Socket.io)

### Step 13 — Open a WebSocket in Postman

1. Click **New** → **WebSocket Request**
2. URL: `ws://localhost:6001`
3. Click **Connect**
4. Send this JSON message to join Bob's notification room:
   ```json
   { "event": "join", "data": "BOB_USER_ID_HERE" }
   ```
   *(replace with actual ID from Step 5)*

### Step 14 — Trigger a Notification

In a **separate Postman tab**, create a new task assigned to Bob (Step 6 again).

**Back on the WebSocket tab**, you should immediately receive:
```json
{
  "type": "task-created",
  "taskId": "...",
  "message": "Task \"Fix the login page bug\" has been assigned to you",
  "createdAt": "..."
}
```

> ✅ This confirms BullMQ → notification-service → Socket.io pipeline is working end-to-end.

---

## Quick Reference: Endpoint Table

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| `POST` | `/api/auth/register` | ❌ | Register user |
| `POST` | `/api/auth/login` | ❌ | Login → get token |
| `GET` | `/api/auth/user` | ✅ | Get current user |
| `GET` | `/api/auth/users` | ✅ | List all users (Assignee dropdown) |
| `POST` | `/api/auth/refresh` | ❌ | Refresh access token |
| `POST` | `/api/auth/logout` | ❌ | Logout (revoke refresh token) |
| `POST` | `/api/tasks` | ✅ | Create task |
| `GET` | `/api/tasks?filter=assignedTo` | ✅ | Tasks assigned to me |
| `GET` | `/api/tasks?filter=createdBy` | ✅ | Tasks I created |
| `GET` | `/api/tasks/:id` | ✅ | Get task by ID |
| `PATCH` | `/api/tasks/:id` | ✅ | Update task |
| `DELETE` | `/api/tasks/:id` | ✅ | Delete task (creator only) |
| `WS` | `ws://localhost:6001` | — | Real-time notifications |

