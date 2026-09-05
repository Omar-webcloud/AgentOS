"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "@/lib/api";
import { setSession, type SessionUser } from "@/lib/auth";
import type { BrainId } from "@/lib/brains";

export function ContinueWithGoogle({
  brain,
  onSuccess,
}: {
  brain?: BrainId | null;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSuccess(credential: string) {
    try {
      const res = await api<{ token: string; user: SessionUser }>("/api/v1/auth/google", {
        method: "POST",
        body: JSON.stringify({
          idToken: credential,
          brain: brain ?? undefined,
        }),
      });
      setSession(res.token, res.user);
      if (onSuccess) onSuccess();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            handleSuccess(credentialResponse.credential);
          }
        }}
        onError={() => setError("Google sign-in was unsuccessful")}
        useOneTap
        shape="pill"
        width="100%"
      />
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}

export function GooglePicker({
  open,
  brain,
  onClose,
}: {
  open: boolean;
  brain: BrainId | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-[2px]">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-3xl bg-base-900 border border-base-700 text-slate-200 shadow-2xl p-8">
        <h2 className="text-center text-[24px] font-normal tracking-tight text-paper mb-6">
          Sign in with Google
        </h2>
        <ContinueWithGoogle brain={brain} onSuccess={onClose} />
      </div>
    </div>
  );
}
