# DY Group Production

DY Group 正式版 Phase 1 工程架构。

## 技术栈

- React
- Vite
- TypeScript
- React Router
- Supabase Auth / PostgreSQL / Storage / RLS
- Vercel

## 本地运行

```bash
npm install
npm run dev
```

打开 Vite 输出的本地地址。

## 环境变量

复制 `.env.example` 为 `.env`，并填入 Supabase 项目配置：

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Supabase Migration

Phase 2 migration 文件：

```text
supabase/migrations/202606090001_phase2_auth_foundation.sql
```

可在 Supabase Dashboard 的 SQL Editor 中执行，或使用 Supabase CLI 执行。

## 构建

```bash
npm run build
```

## 部署

项目已包含 `vercel.json`，连接 GitHub 仓库后在 Vercel 中配置相同环境变量即可部署。
