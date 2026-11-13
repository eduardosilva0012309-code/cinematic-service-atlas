import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type AdminSession = { admin?: boolean };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "rost-painel",
    maxAge: 60 * 60 * 24 * 7,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

async function requireAdmin() {
  const session = await useSession<AdminSession>(sessionConfig());
  if (!session.data.admin) throw new Error("Não autorizado");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type Settings = {
  brand: string; hero_kicker: string; hero_title: string; hero_subtitle: string;
  hero_image_url: string | null; cta_label: string; cta_link: string;
  instagram_link: string; footer_text: string;
};
export type Service = {
  id: string; title: string; tagline: string; description: string;
  image_url: string | null; button_label: string; button_link: string; sort_order: number;
};
export type WithImage<T> = T & { image_src: string | null };

async function sign(paths: (string | null)[]) {
  const sb = await admin();
  const valid = paths.filter((p): p is string => !!p);
  const map = new Map<string, string>();
  if (valid.length) {
    const { data } = await sb.storage.from("media").createSignedUrls(valid, 60 * 60 * 24);
    data?.forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
  }
  return (p: string | null) => (p ? map.get(p) ?? null : null);
}

export const getVitrine = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const [{ data: s }, { data: sv }] = await Promise.all([
    sb.from("site_settings").select("*").eq("id", 1).single(),
    sb.from("services").select("*").order("sort_order", { ascending: true }),
  ]);
  const services = (sv ?? []) as Service[];
  const settings = s as Settings;
  const get = await sign([settings.hero_image_url, ...services.map((x) => x.image_url)]);
  return {
    settings: { ...settings, image_src: get(settings.hero_image_url) },
    services: services.map((x) => ({ ...x, image_src: get(x.image_url) })),
  };
});

function matches(a: string, b: string) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export const unlockPanel = createServerFn({ method: "POST" })
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_PASSWORD"];
    if (!expected || !matches(String(data.password ?? ""), expected)) return { ok: false };
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ admin: true });
    return { ok: true };
  });

export const lockPanel = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true };
});

export const isUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { ok: !!session.data.admin };
});

const SETTING_KEYS = ["brand","hero_kicker","hero_title","hero_subtitle","hero_image_url","cta_label","cta_link","instagram_link","footer_text"] as const;
const SERVICE_KEYS = ["title","tagline","description","image_url","button_label","button_link","sort_order"] as const;

function pick<K extends string>(obj: Record<string, unknown>, keys: readonly K[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((d: Partial<Settings>) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("site_settings").update({ ...pick(data, SETTING_KEYS), updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveService = createServerFn({ method: "POST" })
  .inputValidator((d: Partial<Service> & { id?: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await admin();
    const fields = pick(data, SERVICE_KEYS);
    if (data.id) {
      const { error } = await sb.from("services").update(fields).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await sb.from("services").insert(fields);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteService = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await admin();
    const { error } = await sb.from("services").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createUploadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: { ext: string }) => d)
  .handler(async ({ data }) => {
    await requireAdmin();
    const sb = await admin();
    const ext = String(data.ext).replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    const path = `uploads/${crypto.randomUUID()}.${ext}`;
    const { data: up, error } = await sb.storage.from("media").createSignedUploadUrl(path);
    if (error || !up) throw new Error(error?.message ?? "Falha no upload");
    return { path, token: up.token };
  });
