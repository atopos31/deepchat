export interface config {
  baseURL: string | undefined;
  apiKey: string;
}

const defaultURL = new Map<string, string>(
  [
    ["deep", "https://api.deepseek.com"],
    ["chat", "https://generativelanguage.googleapis.com/v1beta/openai/"],
  ],
);

export const GetConfig = (name: "deep" | "chat"): config => {
  name.toUpperCase;
  return {
    baseURL: Deno.env.get(`${name}_BASE_URL`) ??
      defaultURL.get(name),
    apiKey: Deno.env.get(`${name}_KEY`) ?? "",
  };
};
