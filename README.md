# SP2025 – Hackathon Management System

This project is a **Hackathon Management System** developed as part of the **Software Project 2025 course**.  
The system supports organizing hackathons end-to-end: managing participants, questionnaires, team generation, and administrative oversight.

The solution consists of a **Java Spring Boot backend** and a **React-based frontend**.

---

## Project Goals

- Provide a structured way to register hackathon participants
- Collect participant data via dynamic questionnaires
- Enable team generation based on motivation, experience, roles, and skills
- Offer administrative tools for hackathon organizers
- Ensure clean architecture, maintainability, and scalability

---

## Key Features

### Participant Management
- Participant registration per hackathon
- One questionnaire submission per participant per hackathon
- Validation of required and optional questionnaire fields

### Questionnaire System
- Support for internal and imported questionnaires
- Multiple question types:
    - Text
    - Number input
    - Single choice
    - Multi choice
    - Boolean / consent
- Required vs optional questions
- JSON-based questionnaire and answer storage

### Team Generation
- Automatic team generation based on:
    - Motivation level
    - Years of experience
    - Role preferences
    - Skill distribution
- Team scoring (0–5) reflecting balance and cohesion
- Manual team adjustment after generation (drag & drop)

### Admin Functionality
- View and manage hackathons
- Inspect questionnaire answers
- Generate and edit teams
- Secure admin-only endpoints

---

## Architecture Overview

- React Frontend
- REST API (Spring Boot)
- Business Logic
- PostgreSQL

The backend follows a layered architecture:
- Controller layer
- Service layer
- Repository layer
- DTOs for API contracts

---

## Local Development Setup

### Prerequisites
- Java 17 or newer
- Node.js 18+ and npm
- Docker & Docker Compose
- Git

---

## Database Setup (PostgreSQL via Docker)

For local development, PostgreSQL is provided via Docker.

### Docker Configuration

```yaml
services:
  postgres:
    image: postgres:latest
    environment:
      POSTGRES_DB: hackathon
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5433:5432"
```

Start the database:
```bash
docker compose up -d
```

Database connection details:
- Host: localhost
- Port: 5433
- Database: hackathon
- Username: dev
- Password: dev

## Backend Setup and Start (Spring Boot)

Clone the repository:
```bash
git clone <repository-url>
cd sp2025-hackathon/backend
```
Configure the local profile in application-local.yml:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5433/hackathon
    username: dev
    password: dev
```

Run the backend using the local profile:
```bash
mvn clean spring-boot:run -Dspring-boot.run.profiles=local
```
Backend will be available at: http://localhost:8081

## Frontend Setup and Start (React)

Navigate to the frontend directory:
```bash
cd ../frontend
```
Install dependencies:
```bash
npm install
```
Start the development server:
```bash
npm run dev
```
Frontend will be available at:
```dts
http://localhost:5173
```