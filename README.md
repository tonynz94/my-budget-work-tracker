# MY Budget and Work Tracker

This is my personal app. I use it to track my part-time work hours and my spending in one place.

I am an international student in Auckland. My student visa lets me work 25 hours a week, so I need to know how many hours I have left. I also want to know how much I can spend each day until the next payday.

## What it does

- It records my work hours and shows the hours left this week.
- It shows how much I earned in each pay period, before tax and after tax.
- It shows how much I can spend today, based on my last pay.
- It writes fixed costs like rent into the budget book when their date comes.
- It knows the New Zealand public holidays and the PAYE tax rates.
- It exports the work records and the budget records as CSV files.

The calculations are in `src/lib` and they have tests. I wrote the tests from the examples in my own spec, for example the daily budget and the tax for one pay period.

## Tech

- React, TypeScript and Vite
- PWA, so the same code runs on my laptop and my iPhone
- Supabase for Google login and the database
- Vercel for hosting

Only one Google account can log in. The database checks this with Row Level Security.

## Run it

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase values.
3. Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor.
4. Run `npm run dev`.

Run `npm test` for the tests.
