# 🧩 System Overview — Coding Exam Platform

A complete overview of all components, their roles, and how they connect in the coding exam platform built with **Go**, **Rust**, **React**, **PostgreSQL**, **Redis**, and **Docker**.

---

## 🧠 Big Picture

The system is made up of **four major parts**, all working together:

1. **Frontend (React)** — What students and teachers interact with  
2. **Backend API (Go)** — The main brain and controller of all data  
3. **Judge System (Rust)** — Securely runs and grades submitted code  
4. **Infrastructure (PostgreSQL, Redis, Docker, OS)** — The foundation holding it all together  

---

## 🕸️ Architecture Diagram

```
   ┌──────────────────────────────────────────────────────────┐
   │                        Frontend (React)                  │
   │     - UI for students & teachers                         │
   │     - Sends API requests to backend                      │
   └───────────────▲───────────────────────────────┬──────────┘
                   │ HTTP (REST / WebSocket)       │
                   │                               │
   ┌───────────────┴───────────────────────────────▼──────────┐
   │                      Backend (Go)                        │
   │  - Auth, Users, Problems, Submissions                    │
   │  - Talks to PostgreSQL & Redis                           │
   │  - Pushes jobs to queue for judge                        │
   └───────────────▲───────────────────────────────┬──────────┘
                   │ SQL / Queue                   │ Queue
                   │                               │
   ┌───────────────┴──────────────┐       ┌────────┴────────────────┐
   │  PostgreSQL Database          │       │  Rust Judge System      │
   │  - Stores all platform data   │       │  - Listens to queue     │
   │  - Users, Problems, Results   │       │  - Runs code in Docker  │
   │                               │       │  - Sends verdicts back  │
   └───────────────────────────────┘       └─────────────────────────┘
```

---

## 🖥️ Frontend (React + Monaco Editor)

### 🧭 Role
The **user interface** — what students and teachers use.

### 🧱 Responsibilities
- Display the problem list and problem details.
- Provide a **code editor** (Monaco).
- Handle **login / signup** for users.
- Send code submissions to backend.
- Poll or listen for **real-time verdicts**.

### 🔗 Connects To
- **Backend API (Go)** via:
  - `HTTP` (for data)
  - `WebSocket` or polling (for live status)

### 💬 Example Flow
1. Student opens a problem.  
2. Frontend requests `GET /api/problems/1`.  
3. Student writes code and clicks **Submit**.  
4. Frontend sends `POST /api/submissions`.  
5. Waits for result and displays verdict.

---

## ⚙️ Backend API (Go)

### 🧭 Role
The **orchestrator** — connects frontend, database, and judge system.

### 🧱 Responsibilities
- Authenticate users (login/register)
- Manage problems and submissions
- Send jobs to the **queue**
- Receive verdicts from the **judge**
- Store results in the **database**
- Serve data to the **frontend**

### 🧰 Libraries
- **Gin / Fiber** — REST API framework  
- **GORM** — ORM for PostgreSQL  
- **JWT** — authentication  
- **Redis / RabbitMQ client** — queue management  

### 🔗 Connects To
| Component | Type | Purpose |
|------------|------|----------|
| Frontend | HTTP / WebSocket | Send and receive data |
| PostgreSQL | SQL | Persistent storage |
| Redis / RabbitMQ | Queue | Job dispatch |
| Rust Judge | Queue / HTTP | Receive verdicts |

### 💬 Example Flow
```
1. Backend gets submission via `POST /api/submissions`.  
2. Saves to PostgreSQL.  
3. Pushes job to Redis queue:  
   {
     "submission_id": 123,
     "language": "python",
     "code": "...",
     "test_cases": [...]
   }
4. Judge processes job and sends result.  
5. Backend updates record and notifies frontend.
```

---

## 🔄 Message Queue (Redis / RabbitMQ)

### 🧭 Role
The **messenger** between backend and judge.

### 🧱 Responsibilities
- Store jobs waiting to be processed.
- Allow judge to pick up and return results asynchronously.

### 🔗 Connects To
- **Backend API (Go)** — pushes jobs  
- **Judge System (Rust)** — consumes and reports results  

### 💬 Example Flow
1. Backend pushes submission → Redis stores it.  
2. Judge consumes job → runs code → pushes result.  

### 🧰 Options
- **Redis** — simple, fast, lightweight.  
- **RabbitMQ** — robust, supports retries and priorities.

---

## 🧮 Judge System (Rust)

### 🧭 Role
The **engine** — runs student code safely and checks correctness.

### 🧱 Responsibilities
- Listen for jobs from queue.
- Create **Docker sandbox** per submission.
- Run code against test cases with resource limits.
- Compare outputs and determine verdict.
- Send results back to backend.

### 🔗 Connects To
| Component | Type | Purpose |
|------------|------|----------|
| Queue (Redis/RabbitMQ) | Input | Get submissions |
| Docker Engine | Local API | Run sandboxed code |
| Backend | Output (HTTP or Queue) | Send verdicts |

### 🧰 Libraries
- `tokio`: async runtime  
- `bollard`: Docker client  
- `serde`: JSON serialization  
- `redis-rs / lapin`: queue communication  

### 💬 Example Flow
1. Judge receives job from queue.  
2. Runs code inside Docker container.  
3. Captures output, compares it.  
4. Sends verdict back.  

---

## 🐳 Docker Sandbox

### 🧭 Role
The **safety box** — where untrusted student code runs securely.

### 🧱 Responsibilities
- Isolate code execution from host system.
- Limit CPU, RAM, and time.
- Provide runtime environments for each language.
- Destroy containers after execution.

### 🔗 Connects To
- **Judge System (Rust)** — uses Docker API to create, monitor, and remove containers.

### 💬 Example Flow
1. Judge creates container → `docker run python:3.11`.  
2. Mounts student’s `code.py`.  
3. Executes `python3 code.py`.  
4. Captures output → destroys container.

---

## 🗄️ PostgreSQL Database

### 🧭 Role
The **memory** of the system — stores all structured data.

### 🧱 Responsibilities
- Store user accounts, problems, test cases, and submissions.
- Record verdicts and timestamps.
- Provide analytics and leaderboard data.

### 🔗 Connects To
- **Backend API (Go)** — via SQL through GORM ORM.

### 💬 Example Tables
| Table | Purpose |
|--------|----------|
| `users` | Accounts and roles |
| `problems` | Problem descriptions and metadata |
| `test_cases` | Input/output pairs |
| `submissions` | Student code, verdicts, timestamps |

---

## 🧩 Infrastructure & Hosting (Not important)

### 🧭 Role
The foundation where everything runs.

### 🧱 Components
- **Ubuntu Linux** — base operating system  
- **Docker Compose / Kubernetes (k3s)** — container orchestration  
- **Nginx / Traefik** — reverse proxy + HTTPS  
- **Prometheus + Grafana** — monitoring  
- **GitHub Actions / CI** — automated build and deploy  

### 🔗 Connects To
All components — it hosts and manages them.

---

## 🔗 Data Flow Summary

1. **Student** logs in via frontend.  
2. Frontend calls backend API → backend verifies credentials.  
3. Student submits code.  
4. Backend stores submission → pushes job to queue.  
5. **Judge** consumes job → runs code in **Docker** → produces verdict.  
6. Judge sends verdict → backend updates **PostgreSQL**.  
7. Backend notifies **frontend** → shows result to student.  

---

## 🧩 Relationships Table

| Component | Talks To | Purpose |
|------------|-----------|----------|
| Frontend | Backend | Send/receive user data |
| Backend | Frontend | Provide data, updates |
| Backend | PostgreSQL | Store/retrieve all data |
| Backend | Redis/RabbitMQ | Dispatch jobs |
| Judge | Queue | Consume and process jobs |
| Judge | Docker | Run code safely |
| Judge | Backend | Return results |
| Docker | Judge | Execution sandbox |

---

## 👩‍💻 Team Roles & Focus

| Team Role | Focus Area | Technologies |
|------------|-------------|---------------|
| 🧑‍🎨 Frontend Developer | UI, API integration, Monaco Editor | React, TypeScript |
| 🧑‍💻 Backend Developer | API, DB, Queue, Logic | Go, SQL, Redis |
| 🧑‍🔬 Judge Engineer | Code execution, Docker sandboxing | Rust, Docker |
| 🧑‍🔧 DevOps / SysAdmin | Deployment, monitoring | Docker, Linux, Nginx |
| 🧑‍🏫 Teacher / Admin | Problem setup, grading | Web UI usage |

---

## 🏁 Summary

| Component | Role | Key Tech |
|------------|------|-----------|
| Frontend | User interface | React, Monaco |
| Backend | Logic & API | Go, GORM, JWT |
| Judge | Code execution | Rust, Docker |
| Queue | Communication bridge | Redis / RabbitMQ |
| Database | Storage | PostgreSQL |
| Infrastructure | Hosting & orchestration | Docker, Linux |

**Workflow:**
> Student → Frontend → Backend → Queue → Judge → Backend → Database → Frontend → Student 🎉

---

**Author:** *Your Team Name*  
**Version:** 1.0.0  
**License:** MIT  
