# Expense Atlas (React)

Expense Atlas is now a React + Vite app for tracking event budgets, expenses, members, and profit.

## Stack

- React 18
- React Router
- Vite
- localStorage persistence

## Development

1. Install dependencies:
	npm install
2. Start local development server:
	npm run dev

## Production Build

1. Build:
	npm run build
2. Preview production build locally:
	npm run preview

The generated deployable output is in the `dist/` folder.

## Deploy Options

- Vercel: import the repository, framework preset `Vite`, build command `npm run build`, output directory `dist`.
- Netlify: build command `npm run build`, publish directory `dist`.
- GitHub Pages: deploy the contents of `dist` using a Pages workflow.

## Notes

- Existing saved browser data under `expense-atlas-v1` remains compatible.
- Currency formatting uses the browser locale with USD style formatting.
