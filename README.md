> This is a fork of [@Mintplex-Labs/piper-tts-web/](https://github.com/Mintplex-Labs/piper-tts-web/) for use
> of PiperTTS modules inside of a browser/Electron for RealTimeX.ai.
> A big shout-out goes to [Rhasspy Piper](https://github.com/rhasspy/piper), who open-sourced all the currently available models (MIT License) and to [@jozefchutka](https://github.com/jozefchutka) who came up with the wasm build steps.
>
> **This fork includes upgrades to ONNX Runtime 1.22.0 and enhanced offline support.**

# Run PiperTTS based text-to-speech in the browser powered by [ONNX Runtime 1.22.0](https://onnxruntime.ai/)

## Difference from the original

### Caching for client

You can leverage `TTSSessions` for a faster inference. (see index.js for implementation)
Credit to [this PR](https://github.com/diffusion-studio/vits-web/pull/5) for the starting point.

### Local WASM/Loading

You can define local WASM paths for the `ort` wasm as well as the phenomizer wasm and data file for faster local loading
since the client could be offline.

### Note:

This is a frontend library and will not work with NodeJS.

## Usage
First of all, you need to install the library:
```bash
yarn add @therealtimex/piper-tts-web
```

Then you're able to import the library like this (ES only)
```typescript
import * as tts from '@realtimex/piper-tts-web';
```

Now you can start synthesizing speech!
```typescript
const wav = await tts.predict({
  text: "Text to speech in the browser is amazing!",
  voiceId: 'en_US-hfc_female-medium',
});

const audio = new Audio();
audio.src = URL.createObjectURL(wav);
audio.play();

// as seen in /example with Web Worker
```

## Advanced Configuration

### TTS Session Options

For more control over the TTS session, you can use the `TtsSession` class directly:

```typescript
import { TtsSession } from '@realtimex/piper-tts-web';

const session = new TtsSession({
  voiceId: 'en_US-hfc_female-medium',
  allowLocalModels: true, // Allow loading local models (default: true)
  fallbackStrategy: 'auto', // 'cdn', 'local', or 'auto' (default: 'cdn')
  wasmPaths: {
    onnxWasm: '/custom/path/to/onnx/',
    piperData: '/custom/path/to/piper_phonemize.data',
    piperWasm: '/custom/path/to/piper_phonemize.wasm'
  },
  progress: (progress) => {
    console.log(`Loading: ${Math.round(progress.loaded * 100 / progress.total)}%`);
  },
  logger: (message) => {
    console.log(`TTS: ${message}`);
  }
});

const wav = await session.predict('Hello, world!');
```

### Configuration Options

- **`allowLocalModels`**: Enable/disable local model loading (default: `true`)
- **`fallbackStrategy`**: How to handle CDN failures:
  - `'cdn'`: Only use CDN (original behavior)
  - `'local'`: Only use local paths
  - `'auto'`: Try CDN first, fallback to local on failure
- **`wasmPaths`**: Custom paths for WASM files
- **`progress`**: Callback for download progress
- **`logger`**: Callback for debug messages

### Offline Support

This version includes enhanced offline support:

1. **Automatic fallback**: When `fallbackStrategy: 'auto'` is used, the library will automatically fallback to local WASM files if CDN is unreachable
2. **Retry logic**: Failed downloads are automatically retried with exponential backoff
3. **Better error messages**: More descriptive error messages help diagnose issues

### Migration from @mintplex-labs/piper-tts-web

1. Update your package.json:
```json
{
  "dependencies": {
    "@therealtimex/piper-tts-web": "^1.1.0"
  }
}
```

2. Update imports:
```typescript
// Old
import * as tts from '@mintplex-labs/piper-tts-web';

// New
import * as tts from '@realtimex/piper-tts-web';
```

3. Optionally configure new options:
```typescript
const session = new TtsSession({
  voiceId: 'en_US-hfc_female-medium',
  allowLocalModels: true, // Now configurable!
  fallbackStrategy: 'auto' // Enhanced offline support
});
```


With the initial run of the predict function you will download the model which will then be stored in your [Origin private file system](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system). You can also do this manually in advance *(recommended)*, as follows:
```typescript
await tts.download('en_US-hfc_female-medium', (progress) => {
  console.log(`Downloading ${progress.url} - ${Math.round(progress.loaded * 100 / progress.total)}%`);
});
```

The predict function also accepts a download progress callback as the second argument (`tts.predict(..., console.log)`). <br>

If you want to know which models have already been stored, do the following
```typescript
console.log(await tts.stored());

// will log ['en_US-hfc_female-medium']
```

You can remove models from opfs by calling
```typescript
await tts.remove('en_US-hfc_female-medium');

// alternatively delete all

await tts.flush();
```

And last but not least use this snippet if you would like to retrieve all available voices:
```typescript
console.log(await tts.voices());

// Hint: the key can be used as voiceId
```

## What's New in v1.1.0

- ✅ **ONNX Runtime 1.22.0**: Updated to the latest version
- ✅ **Configurable `allowLocalModels`**: No more hardcoded restrictions
- ✅ **Enhanced offline support**: Automatic CDN fallback strategies
- ✅ **Better error handling**: Retry logic and descriptive error messages
- ✅ **Improved logging**: Optional debug logging for troubleshooting

### **That's it!** Happy coding :)
