# SSE 流式协议

## 传输层

**选型：`@microsoft/fetch-event-source`**（已安装）

- 需要 POST（传 question + threadId），原生 EventSource 只支持 GET，排除
- 手写 fetch + ReadableStream 需要自行解析 SSE 协议（id/event/data 字段）、处理重连退避、AbortController 取消，重复造轮子，排除
- LangChain `useStream` 是服务端 streamEvents() 用的，跟我们的自定义事件协议不匹配，排除

该库负责：SSE 协议解析、POST 请求、自动重连 + 指数退避、`openWhenHidden`（切标签页不断连）、`onclose` vs `onerror` 区分。
不负责：状态管理、消息去重、工具追踪 — 这些是 store 的职责（见 `store/chat/slices/sse.ts` + `step.ts`）。

## 事件类型

| 事件 | payload | 说明 |
|------|---------|------|
| `step_start` | `{ step_id, type, label }` | 新步骤开始，前端建骨架占位 |
| `thought` | `{ step_id, content }` | Agent 推理文本 |
| `tool_call` | `{ step_id, name, args }` | 准备调用工具 |
| `observation` | `{ step_id, name, result, duration_ms? }` | 工具返回结果 |
| `answer_chunk` | `{ step_id, content }` | 流式逐字输出 |
| `step_end` | `{ step_id }` | 步骤完成 |
| `interrupt` | `{ interrupt_id, message, tool_name?, tool_args? }` | 工具执行后暂停 |
| `error` | `{ message, code?, step_id? }` | 执行出错 |
| `done` | `{}` | 全部完成 |

完整 TypeScript 类型：`src/types/agent.ts` → `SSEEventPayloadMap`

## 步骤状态机

```
pending → running → done
                  → error
```

- `step_start` → status: `pending`（骨架）
- `thought` / `tool_call` / `observation` / `answer_chunk` → status: `running`（填充内容）
- `step_end` → status: `done`
- `error` → status: `error`

## 中断流程

中断不维持 SSE 连接，resume 是新请求：

```
POST /api/agent → ... → interrupt 事件 → 连接关闭
用户确认后 → POST /api/agent/{threadId}/resume → 继续 + done
```

## 历史回放

`extractSteps(messages)` 把 LangGraph 消息转 `AgentStep[]`，复用 AgentSteps 组件渲染（全部 status: `done`）。
