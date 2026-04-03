import { compare } from "bcryptjs";
import type { Env, AuthSession } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { getTechnicianByEmail, getTechnicianById } from "../db/queries";

export async function login(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { email, password } = body;
  if (!email || !password) {
    return errorResponse("Email and password are required", 400, request);
  }

  const technician = await getTechnicianByEmail(env.DB, email);
  if (!technician) {
    return errorResponse("Invalid email or password", 401, request);
  }

  const passwordValid = await compare(password, technician.password_hash);
  if (!passwordValid) {
    return errorResponse("Invalid email or password", 401, request);
  }

  // Generate token
  const token = `ritems_${crypto.randomUUID().replace(/-/g, "")}`;
  const session: AuthSession = {
    technician_id: technician.id,
    role: technician.role,
    name: technician.name,
    created_at: new Date().toISOString(),
  };

  // Store in KV with 24h TTL
  await env.KV.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: 86400,
  });

  return jsonResponse(
    {
      token,
      technician: {
        id: technician.id,
        name: technician.name,
        role: technician.role,
        email: technician.email,
      },
    },
    200,
    request
  );
}

export async function logout(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ritems_")) {
    const token = authHeader.slice(7);
    await env.KV.delete(`session:${token}`);
  }

  return jsonResponse({ success: true }, 200, request);
}

export async function me(request: Request, env: Env): Promise<Response> {
  const sessionOrError = await authenticate(request, env);
  if (sessionOrError instanceof Response) return sessionOrError;

  const technician = await getTechnicianById(env.DB, sessionOrError.technician_id);
  if (!technician) {
    return errorResponse("Technician not found", 404, request);
  }

  return jsonResponse(
    {
      id: technician.id,
      name: technician.name,
      role: technician.role,
      email: technician.email,
      phone: technician.phone,
      assigned_entities: JSON.parse(technician.assigned_entities),
    },
    200,
    request
  );
}
