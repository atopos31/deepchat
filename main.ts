import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  chatCompletionSchema,
  chatCompletionType,
  contentItem,
  userContent,
} from "./types.ts";
import { chat, chatStream } from "./openai.ts";
import { streamSSE } from "hono/streaming";
const app = new Hono();

app.post(
  "/v1/chat/completions",
  zValidator("json", chatCompletionSchema),
  async (c) => {
    let reqBody = c.req.valid("json");

    const [deepmodel = "deepseek-r1", chatmodel = "gemini-2.0-flash"] = reqBody.model.split("|",2);
    if (!reqBody.stream) {
      const res = await chat("deep", deepmodel, reqBody.messages);
      // deno-lint-ignore no-explicit-any
      const reasonContent = (res.choices[0].message as any).reasoning_content;
      reqBody = resetReq(reqBody, reasonContent);

      const resChat = await chat("chat", chatmodel, reqBody.messages);
      // deno-lint-ignore no-explicit-any
      (resChat.choices[0].message as any).reasoning_content = reasonContent;
      return c.json(resChat, 200);
    }

    return streamSSE(
      c,
      async (stream) => {
        const res = await chatStream("deep", deepmodel, reqBody.messages);
        let reasonContent = "";
        for await (const chunk of res) {
          // deno-lint-ignore no-explicit-any
          const reasoning_content = (chunk.choices[0].delta as any).reasoning_content;
          if (reasoning_content != null) {
            await stream.writeSSE({
              data: JSON.stringify(chunk),
            });
            reasonContent += reasoning_content as string;
          } else {
            break;
          }
        }
        reqBody = resetReq(reqBody, reasonContent);
        const resChat = await chatStream("chat", chatmodel, reqBody.messages);
        for await (const chunk of resChat) {
          await stream.writeSSE({
            data: JSON.stringify(chunk),
          });
        }
      },
    );
  },
);

app.onError((err, c) => {
  return c.json({ error: err }, 500);
});

const resetReq = (reqBody: chatCompletionType, reasonContent: string) => {
  // deno-lint-ignore prefer-const
  let oldUserMsg = reqBody.messages.at(-1);
  if (Array.isArray(oldUserMsg)) {
    (oldUserMsg as contentItem[]).forEach((e) => {
      if (e.type === "text") {
        e.text =
          `Here's user's request:${e.text}\n\nHere's user's reasoning process:\n${reasonContent}\n\nBased on this reasoning, Provide ypur response in the form of user's request.Your response language depends on the request language.`;
      }
    });
  } else {
    (oldUserMsg as userContent).content =
      `Here's user's request:${oldUserMsg?.content}\n\nHere's user's reasoning process:\n${reasonContent}\n\nBased on this reasoning, Provide ypur response in the form of user's request.Your response language depends on the request language.`;
  }
  reqBody.messages.pop();
  if (oldUserMsg) {
    reqBody.messages.push(oldUserMsg);
  }
  return reqBody;
};

Deno.serve(app.fetch);
