import { InferenceConfig, ProgressCallback, VoiceId } from "./types";
import { HF_BASE, ONNX_BASE, PATH_MAP, WASM_BASE } from './fixtures';
import { readBlob, writeBlob } from './opfs';
import { fetchBlob } from './http.js';
import { pcm2wav } from './audio';

interface TtsSessionOptions {
  voiceId: VoiceId;
  progress?: ProgressCallback;
  logger?: (text: string) => void;

  /** 
   * These are the option paths to a PUBLIC directory or server endpoint
   * which can retrieve the relevant WASMs to use PiperTTS models.
   * The defaults can be viewed in ./fixtures constants
   * onnxWasm: {@link ONNX_BASE}
   * piperData/piperWASM: {@link WASM_BASE}
  */
  wasmPaths?: {
    onnxWasm: string
    piperData: string
    piperWasm: string
  };

  /**
   * Allow loading local models. Defaults to true for better offline support.
   * Set to false if you want to restrict model loading to remote sources only.
   */
  allowLocalModels?: boolean;

  /**
   * Fallback strategy when CDN is unreachable.
   * 'cdn' - Only use CDN (default behavior)
   * 'local' - Only use local paths
   * 'auto' - Try CDN first, fallback to local
   */
  fallbackStrategy?: 'cdn' | 'local' | 'auto';
}

const DEFAULT_WASM_PATHS = {
  onnxWasm: ONNX_BASE,
  piperData: `${WASM_BASE}.data`,
  piperWasm: `${WASM_BASE}.wasm`
}

export class TtsSession {
  static WASM_LOCATIONS = DEFAULT_WASM_PATHS;
  static _instance: TtsSession | null = null;
  ready = false;
  voiceId: VoiceId = 'en_US-hfc_female-medium';
  waitReady: Promise<void> | boolean = false;
  #createPiperPhonemize?: (moduleArg?: {}) => any;
  #modelConfig?: any;
  #ort?: typeof import("onnxruntime-web");
  #ortSession?: import("onnxruntime-web").InferenceSession
  #progressCallback?: ProgressCallback;
  #wasmPaths: {
    onnxWasm: string
    piperData: string
    piperWasm: string
  } = DEFAULT_WASM_PATHS;

  // @ts-ignore-next-line
  #logger?: (text: string) => void;

  constructor({
    voiceId,
    progress,
    logger,
    wasmPaths,
    allowLocalModels,
    fallbackStrategy,
  }: TtsSessionOptions) {
    if (TtsSession._instance) {
      logger?.("Reusing session for TTS!");
      TtsSession._instance.voiceId = voiceId ?? TtsSession._instance.voiceId;
      TtsSession._instance.#progressCallback = progress ?? TtsSession._instance.#progressCallback;
      return TtsSession._instance;
    }

    logger?.("New session");
    this.#logger = logger;
    this.voiceId = voiceId;
    this.#progressCallback = progress;
    this.waitReady = this.init(allowLocalModels, fallbackStrategy);
    this.#wasmPaths = wasmPaths ?? DEFAULT_WASM_PATHS;
    this.#logger?.(`Loaded WASMPaths at: ${JSON.stringify(this.#wasmPaths)}`);

    TtsSession._instance = this;
    return this;
  }

  static async create(options: TtsSessionOptions) {
    const session = new TtsSession(options);
    await session.waitReady;
    return session;
  }

  async init(allowLocalModels?: boolean, fallbackStrategy?: 'cdn' | 'local' | 'auto') {
    try {
      const { createPiperPhonemize } = await import("./piper.js");
      this.#createPiperPhonemize = createPiperPhonemize;
      const ortModule = await import("onnxruntime-web");
      this.#ort = ortModule.default || ortModule;

      this.#ort.env.allowLocalModels = allowLocalModels ?? true;
      this.#ort.env.wasm.numThreads = navigator.hardwareConcurrency;
      
      // Apply fallback strategy for WASM paths
      await this.#setupWasmPaths(fallbackStrategy);

      const path = PATH_MAP[this.voiceId];
      if (!path) {
        throw new Error(`Voice ID '${this.voiceId}' not found in PATH_MAP`);
      }

      this.#logger?.(`Loading model config for voice: ${this.voiceId}`);
      const modelConfigBlob = await getBlob(`${HF_BASE}/${path}.json`);
      this.#modelConfig = JSON.parse(await modelConfigBlob.text());

      this.#logger?.(`Loading model for voice: ${this.voiceId}`);
      const modelBlob = await getBlob(
        `${HF_BASE}/${path}`,
        this.#progressCallback
      );
      this.#ortSession = await this.#ort.InferenceSession.create(
        await modelBlob.arrayBuffer()
      );
      
      this.#logger?.(`Successfully initialized TTS session for voice: ${this.voiceId}`);
      this.ready = true;
    } catch (error) {
      this.#logger?.(`Failed to initialize TTS session: ${error}`);
      throw new Error(`TTS Session initialization failed: ${error}`);
    }
  }

  async #setupWasmPaths(fallbackStrategy?: 'cdn' | 'local' | 'auto') {
    const strategy = fallbackStrategy ?? 'cdn';
    
    try {
      if (strategy === 'local') {
        // Use local paths directly
        this.#ort!.env.wasm.wasmPaths = this.#wasmPaths.onnxWasm;
        this.#logger?.('Using local WASM paths');
        return;
      }
      
      if (strategy === 'cdn') {
        // Use CDN paths directly
        this.#ort!.env.wasm.wasmPaths = ONNX_BASE;
        this.#logger?.('Using CDN WASM paths');
        return;
      }
      
      if (strategy === 'auto') {
        // Try CDN first, fallback to local
        try {
          // Test CDN availability with a simple fetch
          const testResponse = await fetch(`${ONNX_BASE}ort-wasm.wasm`, { method: 'HEAD' });
          if (testResponse.ok) {
            this.#ort!.env.wasm.wasmPaths = ONNX_BASE;
            this.#logger?.('CDN available, using CDN WASM paths');
          } else {
            throw new Error('CDN not available');
          }
        } catch (cdnError) {
          this.#logger?.(`CDN failed (${cdnError}), falling back to local WASM paths`);
          this.#ort!.env.wasm.wasmPaths = this.#wasmPaths.onnxWasm;
        }
        return;
      }
    } catch (error) {
      this.#logger?.(`WASM path setup failed: ${error}`);
      // Fallback to local paths as last resort
      this.#ort!.env.wasm.wasmPaths = this.#wasmPaths.onnxWasm;
    }
  }

  async predict(text: string): Promise<Blob> {
    await this.waitReady; // wait for the session to be ready

    const input = JSON.stringify([{ text: text.trim() }]);

    const phonemeIds: string[] = await new Promise(async (resolve) => {
      const module = await this.#createPiperPhonemize!({
        print: (data: any) => {
          resolve(JSON.parse(data).phoneme_ids);
        },
        printErr: (message: any) => {
          throw new Error(message);
        },
        locateFile: (url: string) => {
          // Local reference to data (18mb) and wasm (635kb)
          // if (url.endsWith(".wasm")) return `${WASM_BASE}.wasm`;
          // if (url.endsWith(".data")) return `${WASM_BASE}.data`;
          // if (url.endsWith(".wasm")) return `${import.meta.env.DEV ? '../assets' : '.'}/piper_phonemize.wasm`;
          // if (url.endsWith(".data")) return `${import.meta.env.DEV ? '../assets' : '.'}/piper_phonemize.data`;
          if (url.endsWith(".wasm")) return this.#wasmPaths.piperWasm;
          if (url.endsWith(".data")) return this.#wasmPaths.piperData;
          return url;
        },
      });

      module.callMain([
        "-l",
        this.#modelConfig.espeak.voice,
        "--input",
        input,
        "--espeak_data",
        "/espeak-ng-data",
      ]);
    });

    const speakerId = 0;
    const sampleRate = this.#modelConfig.audio.sample_rate;
    const noiseScale = this.#modelConfig.inference.noise_scale;
    const lengthScale = this.#modelConfig.inference.length_scale;
    const noiseW = this.#modelConfig.inference.noise_w;

    const session = this.#ortSession!;
    const feeds = {
      input: new this.#ort!.Tensor("int64", phonemeIds, [1, phonemeIds.length]),
      input_lengths: new this.#ort!.Tensor("int64", [phonemeIds.length]),
      scales: new this.#ort!.Tensor("float32", [
        noiseScale,
        lengthScale,
        noiseW,
      ]),
    };
    if (Object.keys(this.#modelConfig.speaker_id_map).length) {
      Object.assign(feeds, {
        sid: new this.#ort!.Tensor("int64", [speakerId]),
      });
    }

    const {
      output: { data: pcm },
    } = await session.run(feeds);

    return new Blob([pcm2wav(pcm as Float32Array, 1, sampleRate)], {
      type: "audio/x-wav",
    });
  }
}

/**
 * Run text to speech inference in new worker thread. Fetches the model
 * first, if it has not yet been saved to opfs yet.
 */
export async function predict(
  config: InferenceConfig,
  callback?: ProgressCallback
): Promise<Blob> {
  const session = new TtsSession({
    voiceId: config.voiceId,
    progress: callback,
  });
  return session.predict(config.text);
}

/**
 * Tries to get blob from opfs, if it's not stored
 * yet the method will fetch the blob with retry logic.
 */
async function getBlob(url: string, callback?: ProgressCallback, maxRetries: number = 3) {
  let blob: Blob | undefined = await readBlob(url);

  if (!blob) {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        blob = await fetchBlob(url, callback);
        await writeBlob(url, blob);
        break;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt}/${maxRetries} failed for ${url}: ${error}`);
        
        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s...
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!blob && lastError) {
      throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts: ${lastError.message}`);
    }
  }

  return blob!;
}
