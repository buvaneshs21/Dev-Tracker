import mongoose from "mongoose";

/**
 * Registers a Mongoose model, tolerating Next's dev-server hot reload.
 *
 * The usual `mongoose.models.X || mongoose.model(...)` guard exists because the
 * module is evaluated more than once against one long-lived mongoose singleton.
 * It has a nasty failure mode in development: after editing a schema, HMR
 * re-runs the module, the guard finds the *old* registration and returns it, so
 * the running server keeps a stale schema. Writes to a newly added field are
 * then silently dropped — strict mode discards unknown paths, so the update
 * succeeds and simply doesn't persist. It took a "why won't this save" hunt to
 * find that once; this makes it impossible.
 *
 * In production the module is evaluated once and the guard is all that's
 * needed, so the re-registration is scoped to development.
 */
/**
 * The return type is taken from `mongoose.models` rather than written out, so
 * models keep exactly the type the old `mongoose.models.X || …` expression
 * gave them. Naming a stricter one here makes the compiler instantiate every
 * query helper eleven times over and exhaust its heap.
 */
type RegisteredModel = (typeof mongoose.models)[string];

export function defineModel(
  name: string,
  schema: mongoose.Schema,
): RegisteredModel {
  if (process.env.NODE_ENV !== "production" && mongoose.models[name]) {
    mongoose.deleteModel(name);
  }

  return mongoose.models[name] ?? mongoose.model(name, schema);
}
