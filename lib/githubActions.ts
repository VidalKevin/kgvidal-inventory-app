import type { EnvMap } from "@/lib/supabaseEnv";

type DispatchOptions = {
  workflowId: string;
  ref?: string;
  inputs?: Record<string, string>;
};

export async function dispatchGitHubWorkflow(
  env: EnvMap,
  { workflowId, ref, inputs }: DispatchOptions
) {
  const token = env.GITHUB_ACTIONS_TOKEN || env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER || "VidalKevin";
  const repo = env.GITHUB_REPO || "kgvidal-inventory-app";
  const workflowRef = ref || env.GITHUB_REF || "main";

  if (!token) {
    throw new Error(
      "Missing GITHUB_ACTIONS_TOKEN. Add a GitHub token to Vercel so the app can trigger the Playwright workflow."
    );
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        ref: workflowRef,
        inputs: inputs ?? {},
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub workflow dispatch failed: ${text}`);
  }

  return {
    owner,
    repo,
    workflowId,
    ref: workflowRef,
  };
}
