<h1 align="center">YAPP</h1>
<h2 align="center">
  Yet Another Programming Platform</p>

[![Go](https://img.shields.io/badge/Go-%2300ADD8.svg?&logo=go&logoColor=white)](#)
[![Rust](https://img.shields.io/badge/Rust-%23000000.svg?e&logo=rust&logoColor=white)](#) 
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=fff)](#) ・
[![React](https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB)](#)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](#) ・
[![Postgres](https://img.shields.io/badge/Postgres-%23316192.svg?logo=postgresql&logoColor=white)](#)
[![Redis](https://img.shields.io/badge/Redis-DC382D.svg?logo=redis&logoColor=white)](#)

## How does it works ?
The system is made up of **four major parts**, all working together:

1. **Frontend (React)** — What students and teachers interact with  
2. **Backend API (Go)** — The main brain and controller of all data  
3. **Judge System (Rust)** — Securely runs and grades submitted code  
4. **Infrastructure (PostgreSQL, Redis, Docker, OS)** — The foundation holding it all together  

> [!Note]
[See more here](/docs/system_overview.md)

## Getting Started

> [!Important]
You can also run `docker-compose up` to start all componants at once without needing to install anything else. Don't forget to have your .env file set up by removing or adding a new file `.env` with the right fields.

Start downloading the tools belows:
- **Node.js** `v25.1.0`
  - https://nodejs.org/en/download
- **Go** `1.25.3`
  - https://go.dev/doc/install
  - for hot reloading : https://github.com/air-verse/air
- **Docker - Important !**
  - [Direct link](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe?utm_source=docker&utm_medium=webreferral&utm_campaign=dd-smartbutton&utm_location=module)
- **Rust** `x86_64-pc-windows-gnu`
  - https://forge.rust-lang.org/infra/other-installation-methods.html
  - for hot reloading : https://crates.io/crates/cargo-watch

To start Node.js server :
```bash
cd ./frontend
npm run dev
```

To start Go server :
```bash
cd ./backend
go run .
```

To start Judge/Database server :

- Rust:
  ```bash
  cargo run
  ```
- Postgres/Redis:
  - start the containers

## Implemented Languages
- [x] Python
- [x] Rust
- [] Csharp
- [x] C
- [] Cpp
- [x] Javascript
- [] Typescript
- [x] Go
- [] Java
- [] Swift

## Roadmap

### Q4 2025
- [ ] Set project template and clear roadmaps
- [ ] Create API documentation
- [ ] Set up CI/CD pipeline
- [ ] Basic backend prototype

### Q1 2026
- [ ] Add backend primary functionalitty in `Go` 
- [ ] Add Submit judge in `Rust` & `Docker`
- [ ] Add database integration with `Postgres`
- [ ] Add core frontend features
- [ ] Implement user authentication system

### Q2 2026
- [ ] Polishing project
- [ ] Real-time collaboration features
- [ ] Third-party integrations
- [ ] On premise server integrations

### Future Considerations
- Scale the project more schools and colleges.

---

Made with love for YAPP - *Yet Another P2IP Project*
