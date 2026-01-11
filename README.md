# Polymarket Intelligence PWA

A high-performance intelligence dashboard for Polymarket, combining real-time price data, AI-driven sentiment analysis, global news feeds, and search momentum trends.

## Features

- **Real-time Price Engine**: Tracks Polymarket outcome prices with historical performance charting.
- **Intelligence Feed**: AI-aggregated news articles with automated impact scoring and sentiment classification.
- **Signal Intelligence (CSI)**: Comprehensive Signal Intelligence monitoring network stability, market volatility, and entity consensus.
- **Search Momentum**: Integrated Google Trends tracking to correlate market action with social velocity.
- **AI Summarization**: Daily market driver summaries generated via LLMs.

## Tech Stack

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Realtime, Migrations)
- **AI**: OpenRouter (DeepSeek/Mistral/Gemma)
- **Data Ingestion**: Netlify Functions / Supabase Edge Functions
- **External APIs**: Polymarket Gamma API, TheNewsAPI, Google Trends (Pytrends)

## Deployment Status

[![Netlify Status](https://api.netlify.com/api/v1/badges/your-netlify-id-here/deploy-status)](https://app.netlify.com/sites/csi-pwa/deploys)

*Current Status: Initial Deployment & Environment Sync*

## Setup

1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure environment variables in `apps/web/.env`.
4. Run development server: `npm run dev --workspace=@polymarket-intelligence/web`
