import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authCookieOptions, signToken } from "@/lib/auth";

export async function POST(req: Request) {
    const { email, password } = await req.json();
    await connectDB();

    // Registration stores emails lowercased, so look up the same way.
    const user = await User.findOne({
        email: typeof email === "string" ? email.trim().toLowerCase() : email,
    });

    if (!user) {
        return Response.json({ error: "User not found" }, { status: 400 });
    }

    const isPasswordValidate = await bcrypt.compare(password, user.password);

    if (!isPasswordValidate) {
        return Response.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const token = signToken(String(user._id));

    // httpOnly so JS can't read it — the proxy reads it server-side instead.
    (await cookies()).set(AUTH_COOKIE, token, authCookieOptions);

    return Response.json({ name: user.name, email: user.email });
}
