import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authCookieOptions, signToken } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!name || !email || !password) {
    return Response.json(
      { error: "Name, email and password are all required" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return Response.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }

  await connectDB();

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    // Sign the new user straight in, so signup lands on the dashboard rather
    // than bouncing through the login form.
    (await cookies()).set(
      AUTH_COOKIE,
      signToken(String(user._id)),
      authCookieOptions,
    );

    // Never echo the document back wholesale — it carries the password hash.
    return Response.json(
      { id: String(user._id), name: user.name, email: user.email },
      { status: 201 },
    );
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return Response.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}
