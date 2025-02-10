import { z } from "zod";

const contentItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("image_url"),
    image_url: z.object({
      url: z.string().url(),
    }),
  }),
]);

const messageSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("system"),
    content: z.string(),
    name: z.never().optional(),
  }),
  z.object({
    role: z.literal("user"),
    content: z.union([
      z.string(),
      z.array(contentItemSchema),
    ]),
    name: z.never().optional(), // 不允许 name
  }),
  z.object({
    role: z.literal("assistant"),
    content: z.string(),
    name: z.never().optional(),
  }),
  z.object({
    role: z.literal("function"),
    name: z.string(),
    content: z.string(),
  }),
]);

const messages = z.array(
  messageSchema,
);

export const chatCompletionSchema = z.object({
  model: z.string(),
  messages: messages,
  response_format: z.object({
    type: z.literal("json_schema"),
    json_schema: z.object({
      name: z.string(),
      schema: z.any(),
    }),
  }).optional(),
  stream: z.boolean()
});

export type chatCompletionType = z.infer<typeof chatCompletionSchema>;

export type messages = z.infer<typeof messages>;

export type contentItem = z.infer<typeof contentItemSchema>

export type userContent = {
  role: "user",
  content : string,
}
