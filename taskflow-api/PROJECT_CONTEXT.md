# PROJECT_CONTEXT: TaskFlow API

## 1. Project Overview
TaskFlow API is a multi-tenant project management REST API (simplified Jira backend) built with a microservices architecture. It features independent Express servers for authentication, project management, task management, and notifications.

## 2. Architecture
- **Style:** Microservices
- **Communication:** REST APIs & Bull Queue (Redis-backed)
- **Authentication:** JWT (Access/Refresh tokens) with Redis-based blacklisting
- **Language:** TypeScript
- **Framework:** Express.js

## 3. Services
| Service | Port | Responsibility | Database |
| :--- | :--- | :--- | :--- |
| **Auth Service** | 3001 | User management & Auth | PostgreSQL |
| **Project Service** | 3002 | Project lifecycle & Members | PostgreSQL |
| **Task Service** | 3003 | Task management & Activity | PostgreSQL + MongoDB |
| **Notification Service** | 3004 | Background jobs (Email sim) | N/A |

## 4. Database Design
- **PostgreSQL (Prisma ORM):** Primary relational data (Users, Projects, Tasks).
- **MongoDB (Mongoose):** Activity logs for tasks.
- **Redis:** Token blacklisting and response caching (60s).

## 5. API Endpoints (Planned)
### Auth Service
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`

### Project Service
- `POST /api/projects`
- `GET /api/projects`
- `DELETE /api/projects/:id`
- `POST /api/projects/:id/invite`

### Task Service
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/tasks` (with filtering & pagination)

## 6. System Flows
1. **User Registration:** User registered → PostgreSQL → Bcrypt hashing.
2. **Task Assignment:** Task saved → Bull queue job pushed → Notification service logs "Email sent".
3. **Task Retrieval:** Redis check → Cache hit? Return : Query Postgres → Update Cache → Return.

## 7. Current Implementation Status
- [x] Infrastructure (Docker: Postgres, Mongo, Redis defined)
- [x] Auth Service: Basic Express server & TypeScript config
- [x] Prisma integration (Prisma 7 setup with `prisma.config.ts`)
- [x] User Model defined in `schema.prisma`
- [ ] Database Migration (Running `npx prisma migrate dev`)

## 8. Next Implementation Steps
1. **Run Prisma Migration to create User table.**
2. Implement User Registration Controller with `bcrypt`.
3. Set up JWT Auth Utility.

## 9. Architecture Decisions
- **ADR 001:** Use Prisma as the primary ORM for PostgreSQL for type safety and ease of migrations.
- **ADR 002:** Implement Redis-based caching in Task Service to reduce DB load on frequent reads.
- **ADR 003:** Use MongoDB for Activity Logs to handle high-write volume and flexible schema.
- **ADR 004:** Use Docker Compose for local infrastructure orchestration.
- **ADR 005:** Adopt **Prisma 7** configuration style, moving `url` to `prisma.config.ts` for improved flexibility.
- **ADR 006:** Initialize `PrismaClient` with `datasourceUrl` explicitly in Prisma 7 to ensure runtime connectivity when `url` is omitted from `schema.prisma`.

## 10. Future Improvements
- API Gateway for unified entry point.
- Multi-tenancy isolation at the database schema level.
- Integration testing for cross-service flows.
