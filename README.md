# 🤖 Mychat Pilot

**A powerful multi-tenant SaaS platform for Facebook and Instagram automation**

[![TypeScript](https://img.shields.io/badge/TypeScript-99.1%25-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E)](https://supabase.com/)

---

## ✨ Features

- **🔗 Connect Facebook & Instagram** - Link multiple pages and accounts
- **🤖 AI-Powered Auto-Replies** - Respond to comments and DMs automatically using OpenAI or Gemini
- **📊 Visual Flow Builder** - Create complex automation flows with drag-and-drop
- **📅 Scheduled Posts** - Plan and schedule content in advance
- **💬 Unified Inbox** - Manage all conversations in one place
- **👥 Subscriber Management** - Track and tag your audience
- **💰 Affiliate Program** - Built-in referral system with commission tracking
- **🔐 Multi-tenant Architecture** - Workspaces for team collaboration

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Facebook Developer App

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/xellifi/MCP-V1.git
   cd MCP-V1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   
   Visit `http://localhost:5173`

---

## 🗄️ Database Setup

Run the SQL schema in your Supabase SQL Editor:
- [`supabase_schema.sql`](./supabase_schema.sql) - Main database schema

---

## 📁 Project Structure

```
├── components/       # Reusable UI components
├── pages/           # Application pages
├── services/        # API and service layer
├── lib/             # Supabase client & utilities
├── context/         # React context providers
└── types.ts         # TypeScript type definitions
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, RLS) |
| AI | OpenAI GPT-4, Google Gemini |
| Flow Builder | React Flow |

---

## 📄 License

MIT License - Feel free to use for personal and commercial projects.

---

<div align="center">
  <strong>Built with ❤️ by Mychat Pilot Team</strong>
</div>
