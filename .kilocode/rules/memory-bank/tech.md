# MyGGV-GPS - Tech Stack

## Technologies Used

- **Frontend**: React 19 + Vite
- **Mapping**: MapLibre GL JS
- **Backend**: Supabase
- **Styling**: DaisyUI + shadcn/ui patterns
- **Offline**: Workbox 6 + service workers

## Technical Constraints

- No TypeScript (JavaScript only)
- 100% open-source libraries
- Must work on 3G connections
- 5m accuracy for GPS
- Service worker caching strategy: stale-while-revalidate

## Dependencies

```bash
# From package.json
"dependencies": {
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "maplibre-gl": "^5.6.0",
  "supabase-js": "^2.50.0"
}
```

## Tool Usage Patterns

- Vite for build process
- Supabase for data storage
- MapLibre for map rendering
- Service workers for offline support
- DaisyUI for component styling
