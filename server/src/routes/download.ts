import { Hono } from "hono";
import { spawn } from "child_process";
import { uploadMp3ToS3 } from "../lib/index.js";
import fs from "fs/promises";
import path from "path";

const download = new Hono();

function getAudioFileFromSite(
  siteUrl: string,
): Promise<{ fileName: string; buffer: Buffer }> {
  return new Promise((resolve, reject) => {
    // We can use a temporary output template so we know where/what to look for
    const outputTemplate = path.join("/tmp", "%(id)s.%(ext)s");

    const ytDlpProcess = spawn("yt-dlp", [
      "-x",
      "--audio-format",
      "mp3",
      "-o",
      outputTemplate,
      siteUrl,
    ]);

    let ytDlpOutput = "";
    let errorOutput = "";

    ytDlpProcess.stdout.on("data", (data) => {
      ytDlpOutput += data.toString();
    });

    ytDlpProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    ytDlpProcess.on("close", async (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp error: ${errorOutput.trim()}`));
      }

      try {
        // yt-dlp outputs lines like: [ExtractAudio] Destination: /tmp/xxxxxx.mp3
        // We can parse stdout to find the exact filename it created, or look for the final .mp3 file
        const match = ytDlpOutput.match(/Destination:\s*(.+\.mp3)/i);
        if (!match || !match[1]) {
          return reject(
            new Error(
              "Could not determine downloaded MP3 filename from yt-dlp output.",
            ),
          );
        }

        const filePath = match[1].trim();
        const fileName = path.basename(filePath);

        // Read the file into a Node.js Buffer
        const buffer = await fs.readFile(filePath);

        // Optional cleanup: Delete the local file from /tmp after reading it into memory
        await fs.unlink(filePath).catch(() => {});

        resolve({ fileName, buffer });
      } catch (err) {
        reject(err);
      }
    });
  });
}

download.post("/", async (c) => {
  try {
    const body = await c.req.json();

    const url = body.url;

    if (!url || typeof url !== "string") {
      return c.json({ error: "No audio file provided" }, 400);
    }

    const { buffer, fileName } = await getAudioFileFromSite(url);
    console.log(`Downloaded ${fileName} from ${url}.`);

    console.log(`Uploading ${fileName} to Railway bucket...`);

    await uploadMp3ToS3(fileName, buffer);

    return c.json({ fileName, success: true }, 200);
  } catch (error: any) {
    console.error("Streaming error:", error);
    return c.json(
      { error: error.message || "Internal server error.", success: false },
      500,
    );
  }
});

export { download };
