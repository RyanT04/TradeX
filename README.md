# TradeX

A cryptocurrency trading simulator built with [Next.js](https://nextjs.org). Practice trading with real-time market data and virtual funds — no real money required.

## Getting Started

First, install dependencies:
```bash
npm install
```

Then run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Features

- Real-time cryptocurrency market data
- Virtual portfolio with simulated trading
- Market, limit, and stop orders
- Portfolio performance analytics
- 100+ cryptocurrencies to trade
- User authentication via Supabase

## Tech Stack

- **Framework**: Next.js (App Router)
- **Auth & Database**: Supabase
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui

## Environment Variables

Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)

## Deploy on Vercel

The easiest way to deploy TradeX is via the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

