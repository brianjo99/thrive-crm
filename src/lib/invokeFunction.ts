import { supabase } from "@/integrations/supabase/client";

export async function invokeFunction<Response>(name: string, body: unknown): Promise<Response> {
  const { data, error } = await supabase.functions.invoke<Response>(name, { body });
  if (error) throw error;
  if (data === null || data === undefined) throw new Error("La función no devolvió una respuesta");
  return data;
}
