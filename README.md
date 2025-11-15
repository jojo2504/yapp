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

Start downloading the tools belows:
- **Docker - Important !**
  - [Direct link](https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe?utm_source=docker&utm_medium=webreferral&utm_campaign=dd-smartbutton&utm_location=module)
    
Run `docker-compose up` to start all componants at once without needing to install anything else. Don't forget to have your .env file set up by removing or adding a new file `.env` with the right fields.

> [!Warning]
You may need to install WSL on windows to enable hot reloading

To start Node.js server independently:
```bash
cd ./frontend
npm run dev
```

## Implemented Languages
- [ ] Python
- [ ] Rust
- [ ] Csharp
- [ ] C
- [ ] Cpp
- [ ] Javascript
- [ ] Typescript
- [ ] Go
- [ ] Java
- [ ] Swift

## Roadmap

### Q4 2025
- [X] Set project template and clear roadmaps
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

Made with love for YAPP - *Yet Another P2IP Project* or *Yet Another Programming Platform...*
