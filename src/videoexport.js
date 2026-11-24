// Frame-exact video encoding with WebCodecs + Mediabunny (MP4/H.264 and WebM/VP9 with alpha).
// Every frame gets its exact timestamp, so the clip is perfectly smooth no matter how long a frame
// takes to draw, and fast machines finish faster than real time. This module and Mediabunny are
// loaded only when a video is exported (dynamic import from main.js).
import {
  Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, QUALITY_VERY_HIGH, canEncodeVideo,
} from 'mediabunny';

const CODEC = { mp4: 'avc', webm: 'vp9' };

/** Can this browser encode the format at this size (with alpha for transparent WebM)? */
export async function canEncode(format, size, transparent) {
  if (typeof VideoEncoder === 'undefined') return false;
  try {
    return await canEncodeVideo(CODEC[format], { width: size, height: size, quality: QUALITY_VERY_HIGH, alpha: transparent ? 'keep' : 'discard' });
  } catch {
    return false;
  }
}

/**
 * Encodes `frames` frames drawn into `canvas` by `drawFrame(k)`.
 * @returns {Promise<Blob>}
 */
export async function encodeLoop({ format, canvas, frames, fps, transparent, drawFrame, onProgress }) {
  const output = new Output({
    format: format === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, {
    codec: CODEC[format],
    quality: QUALITY_VERY_HIGH,
    alpha: transparent ? 'keep' : 'discard',
    keyFrameInterval: 1,                     // short clips: every second is a key frame, easy to scrub and loop
  });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  try {
    for (let k = 0; k < frames; k++) {
      drawFrame(k);
      await source.add(k / fps, 1 / fps);   // waits for the encoder when it falls behind (backpressure)
      if (onProgress) onProgress((k + 1) / frames);
    }
    source.close();
    await output.finalize();
  } catch (err) {
    await output.cancel().catch(() => {});
    throw err;
  }
  return new Blob([output.target.buffer], { type: output.format.mimeType });
}
