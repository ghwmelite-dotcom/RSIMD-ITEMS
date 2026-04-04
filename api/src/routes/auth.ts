import { compare, hash } from "bcryptjs";
import type { Env, AuthSession } from "../types";
import { jsonResponse, errorResponse } from "../middleware/error-handler";
import { authenticate } from "../middleware/auth";
import { getTechnicianByEmail, getTechnicianById } from "../db/queries";

const ALLOWED_DOMAIN = "@ohcs.gov.gh";

function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function login(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; pin?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { email } = body;
  const pin = body.pin ?? body.password; // Accept both for backwards compatibility
  if (!email || !pin) {
    return errorResponse("Email and PIN are required", 400, request);
  }

  const technician = await getTechnicianByEmail(env.DB, email.trim().toLowerCase());
  if (!technician) {
    return errorResponse("Invalid email or PIN", 401, request);
  }

  const pinValid = await compare(pin, technician.password_hash);
  if (!pinValid) {
    return errorResponse("Invalid email or PIN", 401, request);
  }

  const token = `ritems_${crypto.randomUUID().replace(/-/g, "")}`;
  const session: AuthSession = {
    technician_id: technician.id,
    role: technician.role,
    name: technician.name,
    created_at: new Date().toISOString(),
  };

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

export async function register(request: Request, env: Env): Promise<Response> {
  let body: { name?: string; email?: string; pin?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, request);
  }

  const { name, email, pin, phone } = body;

  if (!name || !email || !pin) {
    return errorResponse("Name, email, and PIN are required", 400, request);
  }

  // Validate email domain
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.endsWith(ALLOWED_DOMAIN)) {
    return errorResponse(`Only ${ALLOWED_DOMAIN} email addresses are allowed`, 400, request);
  }

  // Validate PIN format
  if (!isValidPin(pin)) {
    return errorResponse("PIN must be 4-6 digits", 400, request);
  }

  // Check if email already exists
  const existing = await getTechnicianByEmail(env.DB, normalizedEmail);
  if (existing) {
    return errorResponse("An account with this email already exists", 409, request);
  }

  const id = `tech-${crypto.randomUUID().slice(0, 8)}`;
  const pinHash = await hash(pin, 10);

  await env.DB.prepare(
    "INSERT INTO technicians (id, name, role, email, phone, assigned_entities, password_hash) VALUES (?, ?, 'technician', ?, ?, '[]', ?)"
  ).bind(id, name.trim(), normalizedEmail, phone?.trim() ?? null, pinHash).run();

  // Auto-login after registration
  const token = `ritems_${crypto.randomUUID().replace(/-/g, "")}`;
  const session: AuthSession = {
    technician_id: id,
    role: "technician",
    name: name.trim(),
    created_at: new Date().toISOString(),
  };

  await env.KV.put(`session:${token}`, JSON.stringify(session), {
    expirationTtl: 86400,
  });

  return jsonResponse(
    {
      token,
      technician: { id, name: name.trim(), role: "technician", email: normalizedEmail },
    },
    201,
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
      assigned_entities: (() => { try { return JSON.parse(technician.assigned_entities); } catch { return []; } })(),
    },
    200,
    request
  );
}
