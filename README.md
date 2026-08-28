# AvatarIndiaCX

AI-powered, multi-tenant customer support CRM — chat, WhatsApp, and voice channels
unified under one system, with an AI resolution engine that answers routine queries
automatically and escalates complex ones to human agents with full context.

**Live demo:** https://avatarindia-cx.vercel.app

## Overview

AvatarIndiaCX is a full-stack customer support platform combining:

- An AI chat widget that resolves common queries automatically, using a custom-built
  knowledge base search engine
- A full case management system for human agents — claim, reply, close, reopen, reassign
- Real-time features: live typing indicators, live message sync, live case updates
- A self-improving knowledge base that detects repeatedly-escalated topics and
  AI-drafts new articles for human review
- Multi-tenant architecture supporting multiple isolated client organizations
- Voice channel integration (via Vapi) — an AI voice agent that handles inbound support
  calls, searches the same knowledge base mid-call, and logs structured case data
- Role-based access control, with configurable per-agent channel permissions
  (chat / WhatsApp / voice)

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript
- **Database:** Turso (distributed libSQL/SQLite)
- **Auth:** NextAuth.js, bcrypt password hashing
- **AI:** Multi-provider fallback (Claude, Gemini, Groq) for chat resolution; Vapi for voice
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Key Features

- AI-first resolution engine with custom lexical search over a knowledge base
- Full case/CRM record per conversation — contact info, internal notes, issue
  categorization, linked case history
- Real-time agent-typing indicator and two-way live message sync
- Self-improving knowledge base — detects recurring gaps, AI-drafts articles for review
- Multi-tenant architecture with per-organization data isolation and secured,
  embeddable widget
- Voice AI integration — inbound call handling, live knowledge-base lookup mid-call,
  structured case logging, transcript capture
- Per-agent, per-channel access control, with case-routing logic that respects each
  agent's permissions
- Admin tooling — team performance analytics, agent management, multi-tenant
  organization management

## Development Note

This project was built through an AI-assisted development process, using Claude
(Anthropic) as a development collaborator. Architecture decisions, debugging, and
testing were directed and verified throughout by the developer, with implementation
code generated and iteratively refined with AI assistance.