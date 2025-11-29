# Node.js Microservice

A basic Node.js microservice application built with Express and TypeScript.

## Project Structure

```
├── src/
│   └── index.ts          # Main application entry point
├── dist/                 # Compiled JavaScript output
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Start the server:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check endpoint
- `POST /api/echo` - Echo back the request body

## Development

- Use `npm run dev` to run with TypeScript directly
- Use `npm run watch` to compile TypeScript in watch mode
- The application runs on port 3000 by default (configurable via `PORT` environment variable)

## Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Build**: TypeScript Compiler
