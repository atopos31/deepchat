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
  const upname = name.toUpperCase();
  return {
    baseURL: Deno.env.get(`${upname}_BASE_URL`) ??
      defaultURL.get(upname),
    apiKey: Deno.env.get(`${upname}_KEY`) ?? "",
  };
};
