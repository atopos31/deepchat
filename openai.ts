import OpenAI from "jsr:@openai/openai";
import { GetConfig } from "./env.ts";
import { messages } from "./types.ts";

export const chat = async (
  name: "deep" | "chat",
  model: string,
  msg: messages,
) => {
  const config = GetConfig(name);
  const openai = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });
  const completion = await openai.chat.completions.create({
    model: model,
    messages: msg,
    stream: false,
  });

  return completion;
};

export const chatStream = async (
  name: "deep" | "chat",
  model: string,
  msg: messages,
) => {
  const config = GetConfig(name);
  const openai = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });
  const completion = await openai.chat.completions.create({
    model: model,
    messages: msg,
    stream: true,
  });

  return completion;
};
