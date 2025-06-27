# Product Pac AI – Amazon Listing Creation Assistant

An AI‑powered workspace that turns raw product info into every asset your Amazon listing needs—titles, bullets, hero shots, infographics, and lifestyle images—all inside a drag‑and‑drop canvas. Built with React Router v7, Convex, and OpenAI.

Keep in mind here we are morphing t Youpac app. So anything that's UI or UX related or the whole functionality of the app is essentially staying the same. We're just making edits to make it an Amazon specific. 

---

## Features

### Core Functionality

* 📦 **Product Upload & Parsing** – Drag in photos, spec sheets, Key features, Optional measurements and keywords. 
* 🤖 **AI Listing Generation** – Assets are generated only for the nodes you place: drag a Title, Bullet, Hero, Infographic, or Lifestyle agent onto the canvas and that specific output appears—nothing runs unless you drop the node and hit generate. (How the app works currently. )
* 🗺️ **Visual Canvas Interface** – Drag‑and‑drop nodes to map your workflow
* 💬 **Smart Chat Integration** – Chat with AI agents to refine copy or visuals
* 👁️ **Listing Preview** – Live desktop & mobile PDP mock‑ups with zoom test
* 🔗 **Share System** – Share read‑only canvas links with collaborators or VAs

### AI Agents

* 📝 **Title Agent** – Crafts catchy, SEO‑rich titles (≤ 200 chars)
* 📋 **Bullet Agent** – Generates five benefit‑led bullets (≤ 200 chars each)
* 🖼️ **Hero Image Agent** – Produces TOS‑compliant 1600 × 1600 hero shots using **gpt‑image‑1**
* 📊 **Infographic Agent** – Lays out feature call‑outs, icons, and comparison snippets
* 🌄 **Lifestyle Agent** – Places product in realistic scenes (1:1 & 4:5 crops) via **gpt‑image‑1**

### Technical Features

* 🚀 **React Router v7** – Modern full‑stack React framework
* ⚡️ **Real‑time Updates** – Live canvas sync with Convex
* 🔒 **TypeScript** – End‑to‑end type safety
* 🎨 **Beautiful UI** – Tailwind CSS v4 + shadcn/ui components
* 🔐 **Authentication** – Secure user management with Clerk
* 📱 **Responsive Design** – Works seamlessly on all devices
* 🚢 **Vercel Ready** – Optimized for one‑click deployment

---

## Tech Stack

### Frontend

* **React Router v7** – Full‑stack React framework with SSR
* **React Flow** – Interactive canvas for visual workflows
* **TailwindCSS v4** – Utility‑first CSS framework
* **shadcn/ui** – Modern component library with Radix UI
* **Lucide React** – Icon library
* **Sonner** – Toast notifications

### Backend & Services

* **Convex** – Real‑time database & serverless functions
* **Clerk** – Authentication and user management
* **OpenAI** – GPT‑4o for text, **gpt‑image‑1** for images
* **Keepa** *(optional)* – Keyword & competitor data

### Development & Deployment

* **Vite** – Lightning‑fast build tool
* **TypeScript** – End‑to‑end type safety
* **Vercel** – Deployment platform

---

## Getting Started

### Prerequisites

* Node.js 18+
* Clerk account
* Convex account
* OpenAI API key

### Installation

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Copy the environment file and add your creds:

```bash
cp .env.example .env.local
```

3. Populate `.env.local`:

```dotenv
# Convex
CONVEX_DEPLOYMENT=your_convex_deployment_here
VITE_CONVEX_URL=your_convex_url_here

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
CLERK_SECRET_KEY=your_clerk_secret_key_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Frontend
FRONTEND_URL=http://localhost:5173
```

4. Initialise Convex:

```bash
npx convex dev
```

5. Add `OPENAI_API_KEY` in the Convex dashboard.

### Development

Start the dev server with HMR:

```bash
npm run dev
```

App runs at [**http://localhost:5173**](http://localhost:5173).

---

## Building for Production

```bash
npm run build
```

---

## Deployment

### Vercel Deployment (Recommended)

1. Connect repo to Vercel
2. Add env variables in Vercel dashboard
3. Deploy on push to `main`

`react-router.config.ts` includes the Vercel preset for seamless deploys.

### Docker Deployment

```bash
docker build -t product-pac .

docker run -p 3000:3000 product-pac
```

Deploy the container to AWS ECS, Cloud Run, Azure Container Apps, Fly.io, etc.

### DIY Deployment

Deploy the output of `npm run build` on any Node host:

```
├── package.json
├── package-lock.json
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server‑side code
```

---

## How It Works

### 1. Upload Product

Drag and drop your product image into the canvas. A **Product Source** node pops up instantly, housing the image and letting you add key details—measurements, features, and target keywords.

### 2. Generate Assets

Drag any agent onto the canvas and that specific asset is generated automatically: pull in a **Title Agent** for fresh titles, a **Hero Image Agent** for compliant hero shots, an **Infographic Agent** for feature call‑outs, or a **Lifestyle Agent** for on‑brand scenes.
Regenerate any asset individually.

### 3. Refine with Chat

@mention agents to tweak tone, reorder keywords, or change scenes—context carries across the whole canvas.

### 4. Preview & Export

Preview desktop & mobile PDP mock‑ups, copy text, download images, and share a read‑only canvas link with collaborators.

## Architecture

### Key Routes

* `/` – Landing page
* `/sign‑in` & `/sign‑up` – Auth pages
* `/dashboard` – Projects dashboard
* `/dashboard/settings` – Profile settings
* `/canvas/:projectId` – Interactive canvas
* `/share/:shareId` – Read‑only canvas

### Key Features

#### Canvas System

* Visual workflow with draggable nodes
* Real‑time collaboration
* Auto‑save every 5 s
* Connection validation between nodes

#### AI Content Generation

* Context‑aware prompts using parsed product data
* Batch "Generate All" button
* Individual regeneration per agent

#### Profile System

* Brand tone & style presets
* Target audience configuration
* Progress tracking

---

## Environment Variables

### Required for Production

| Var                                               | Purpose              |
| ------------------------------------------------- | -------------------- |
| `VITE_CONVEX_URL`                                 | Convex client URL    |
| `VITE_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Auth keys            |
| `OPENAI_API_KEY`                                  | GPT‑4o & gpt‑image‑1 |
| `FRONTEND_URL`                                    | Production URL       |

---

## Project Structure

```
├── app/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── canvas/       # Canvas & nodes
│   │   ├── homepage/     # Landing sections
│   │   ├── dashboard/    # Dashboard layout
│   │   └── preview/      # PDP preview components
│   ├── routes/           # React Router routes
│   │   ├── dashboard/
│   │   └── canvas/
│   ├── lib/              # Utilities
│   └── styles/           # Global CSS
├── convex/
│   ├── schema.ts         # DB schema
│   ├── products.ts       # Product operations
│   ├── agents.ts         # AI agent logic
│   └── projects.ts       # Project management
├── public/               # Static assets
└── docs/                 # Docs
```

---

## Key Dependencies

* `react` & `react‑dom` v19
* `react‑router` v7
* `@clerk/react‑router` – Auth
* `convex` – DB & functions
* `@xyflow/react` – Canvas
* `openai` – GPT‑4o + gpt‑image‑1
* `@vercel/react‑router` – Vercel preset
* `tailwindcss` v4
* `@radix‑ui/*` – UI primitives
* `sonner` – Toasts

---

## Scripts

* `npm run dev` – Start dev server
* `npm run build` – Build for production
* `npm run start` – Serve prod build
* `npm run typecheck` – TypeScript checks

---

## Roadmap

*

---

## Contributing

1. Fork → `git checkout -b feature/my-feature`
2. Commit → `git commit -m "Add feature"`
3. Push → `git push origin feature/my-feature`
4. Open a PR 🎉

---

## License

MIT – see `LICENSE`.

---

**Create Amazon listings that convert—without the grind.** Product Pac AI bundles every PDP asset into a single canvas so you can list faster, rank higher, and sell more.
