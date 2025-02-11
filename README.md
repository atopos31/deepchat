# DeepChat

独特的双阶段对话生成过程：使用 DeepSeek 进行推理和 Gemini 生成最终回应。

1. **推理阶段 (DeepSeek):** 首先，它使用一个“deep”模型（默认为
   `deepseek-r1`，可通过请求中的 `model`
   参数配置）来生成推理内容。该模型充当“思维过程”生成器。
2. **聊天补全阶段 (Gemini):** 然后，它使用一个“chat”模型（默认为
   `gemini-2.0-flash`，可通过 `model` 参数配置，用 `|`
   分隔）来生成最终响应。第一阶段的推理内容会附加到用户的最后一条消息中，提供上下文并指导聊天模型。

这种方法旨在通过显式分离推理和生成步骤来提高响应的质量和连贯性。它支持流式和非流式响应。

## 功能特性

- **两阶段处理：** 使用“deep”模型进行推理，使用“chat”模型生成最终响应。
- **模型配置：** 允许通过 `model`
  参数指定“deep”和“chat”模型（例如，`deepseek-r1|gemini-2.0-flash`）。
- **流式支持：** 支持使用服务器发送事件 (SSE) 的流式响应。
- **请求验证：** 使用 Zod 根据 OpenAI Chat Completions API 模式验证传入请求。

## 安装和使用

1. **环境变量：**

   创建一个 `.env` 文件（或直接设置环境变量），其中包含以下键：

   ```
   DEEP_KEY=your_deepseek_api_key
   CHAT_KEY=your_gemini_api_key
   DEEP_BASE_URL=your_deepseek_base_url  # 可选，默认为 https://api.deepseek.com
   CHAT_BASE_URL=your_gemini_base_url    # 可选，默认为 https://generativelanguage.googleapis.com/v1beta/openai/
   ```

   将 `your_deepseek_api_key` 和 `your_gemini_api_key` 替换为您的实际 API
   密钥。如果您使用不同的模型或端点，请相应地更新 `_BASE_URL` 变量。

2. **安装依赖项：**

   ```bash
   deno install
   ```

3. **运行服务器：**

   ```bash
   deno task dev
   ```

4. **发送请求：**

   向 `/v1/chat/completions` 发送 POST 请求，请求体为符合 OpenAI Chat
   Completions API 模式的 JSON。关键区别在于：

   - **`model`：** 指定要使用的模型，用竖线 (`|`)
     分隔。例如：`deepseek-r1|gemini-2.0-flash`。第一个模型用于推理，第二个模型用于最终响应。
   - **`stream`：** 对于流式响应，设置为 `true`；对于单个响应，设置为 `false`。

   **示例（非流式）：**

   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your_api_key>" \
     -d '{
       "model": "deepseek-r1|gemini-2.0-flash",
       "messages": [
         {
           "role": "user",
           "content": "解释相对论。"
         }
       ],
       "stream": false
     }' \
     http://localhost:8000/v1/chat/completions
   ```

   **示例（流式）：**

   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <your_api_key>" \
     -d '{
       "model": "deepseek-r1|gemini-2.0-flash",
       "messages": [
         {
           "role": "user",
           "content": "写一个关于猫的短篇故事。"
         }
       ],
       "stream": true
     }' \
     http://localhost:8000/v1/chat/completions
   ```
   此代码中实际上并未使用 `Authorization` 标头，但示例中包含它是为了展示标准的
   OpenAI API 用法。 API 密钥是从环境变量中读取的。

## 代码结构

- **`main.ts`：** 主入口点。定义 Hono 应用程序、路由和请求处理逻辑。包括
  `resetReq` 函数，该函数修改第二阶段的请求。
- **`openai.ts`：** 包含 `chat` 和 `chatStream` 函数，这两个函数使用 `openai`
  库与 OpenAI API（或兼容端点）交互。
- **`env.ts`：** 处理加载环境变量并为不同模型提供配置。
- **`types.ts`：** 定义用于请求验证的 Zod 模式和相应的 TypeScript 类型。

## 工作原理（详细）

1. **收到请求：** Hono 服务器收到对 `/v1/chat/completions` 的 POST 请求。
2. **验证：** `zValidator` 中间件根据 `chatCompletionSchema` 验证请求体。
3. **模型拆分：** `model` 字符串被拆分为 `deepmodel` 和
   `chatmodel`（例如，“deepseek-r1”和“gemini-2.0-flash”）。
4. **第一阶段（推理）：**
   - 如果 `stream` 为 `false`，则使用 `deepmodel` 调用 `chat`
     函数以获取包含推理内容的单个响应。
   - 如果 `stream` 为 `true`，则使用 `deepmodel` 调用 `chatStream`
     函数。服务器使用 SSE 流式传输回推理内容块。推理内容会被累积。
5. **请求修改：** `resetReq`
   函数获取原始请求体和累积的推理内容。它将推理内容附加到最后一条用户消息，为下一阶段提供上下文。最后一条用户消息会被保留。
6. **第二阶段（聊天补全）：**
   - 如果 `stream` 为 `false`，则使用 `chatmodel` 和修改后的消息调用 `chat`
     函数。返回最终响应。
   - 如果 `stream` 为 `true`，则使用 `chatmodel` 和修改后的消息调用 `chatStream`
     函数。服务器使用 SSE 流式传输回最终响应块。
7. **响应：** 服务器将最终响应（单个 JSON 对象或 SSE 事件流）发送到客户端。
8. **错误处理：** `app.onError`
   处理程序捕获过程中的任何错误，并返回带有错误消息的 500 错误。
