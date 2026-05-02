import {connectDB} from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
    const { email, password } = await req.json();
    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
        return Response.json({ error: "User not found" }, { status: 400 });
    }

    const isPasswordValidate = await bcrypt.compare(password, user.password);

    if (!isPasswordValidate) {
        return Response.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: "7d" });
    return Response.json({ token });
}
