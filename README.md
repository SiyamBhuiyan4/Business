# BizHub Multi-Business Dashboard

Run locally:

```bash
npm install
npm run dev
```

Open `http://localhost:3000/admin/login` for the Admin interface.

The SQLite development database, including sample Mushroom and Potato data, is included at `prisma/dev.db`. To reset it, run `npm run db:seed`.

For production, copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
