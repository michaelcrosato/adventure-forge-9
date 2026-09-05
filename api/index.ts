import type { ServerResponse } from "node:http";
import { handleVercelRequest, type VercelRequest } from "../src/player/server.js";

/** Vercel's Node function entry point. Session state is reconstructed per request from checkpoints. */
export default async function handler(request: VercelRequest, response: ServerResponse): Promise<void> {
  await handleVercelRequest(request, response);
}
