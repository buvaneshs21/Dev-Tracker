import mongoose from "mongoose";

import { defineModel } from "@/lib/model";

import { BIO_MAX, NAME_MAX } from "@/lib/types";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: NAME_MAX },
    email: { type: String, unique: true },
    password: String,
    // Added with Settings. Absent on existing accounts, which read back as "".
    bio: { type: String, default: "", trim: true, maxlength: BIO_MAX },
  },
  // "Member since" needs a creation date. Accounts predating this have no
  // createdAt — serializeProfile falls back to the ObjectId's own timestamp,
  // so no migration is needed.
  { timestamps: true },
);

export default defineModel("User", UserSchema);
