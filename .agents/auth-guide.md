# JWT 认证

## Token 策略

| | Access Token | Refresh Token |
|---|---|---|
| 时长 | 15min | 7d |
| 存储 | Zustand (localStorage) | httpOnly cookie |
| 传输 | Authorization: Bearer | 自动带 cookie |

## 流程

- **登录/注册** → 签发 access + refresh → 前端存 access 到 store，refresh 设 cookie
- **API 请求** → `services/client.ts` 自动带 `Authorization: Bearer <access>`
- **续期** → 401 → `POST /api/auth/refresh` (cookie 带 refresh) → 新 access → 重试原请求 → 失败则跳 /login
- **登出** → `POST /api/auth/logout` → 清 cookie + store

## 安全要求

- 所有 API route 必须：`WHERE user_id = $1`
- middleware 只校验 JWT，不校验数据归属
- 用户 ID 通过 `x-user-id` header 注入（middleware → route）
