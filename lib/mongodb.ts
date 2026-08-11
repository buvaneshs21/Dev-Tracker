import mongoose from 'mongoose';

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URI!, {
    // Without this the driver waits out its 30s default before giving up, so a
    // blocked IP or a paused cluster turns every request into a 30s hang before
    // the 500. Fail fast and surface the real error instead.
    serverSelectionTimeoutMS: 8000,
  });
};
