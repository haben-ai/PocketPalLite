import React, {useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import {initLlama, LlamaContext} from '@pocketpalai/llama.rn';
import RNFS from 'react-native-fs';

export default function App() {
  const [context, setContext] = useState<LlamaContext | null>(null);
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('No model loaded');

  const MODEL_URL =
    'https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q4_K_M.gguf';
  const MODEL_PATH = `${RNFS.DocumentDirectoryPath}/smollm2.gguf`;

  const downloadAndInitModel = async () => {
    try {
      const exists = await RNFS.exists(MODEL_PATH);
      if (!exists) {
        setStatus('Downloading test model...');
        await RNFS.downloadFile({fromUrl: MODEL_URL, toFile: MODEL_PATH})
          .promise;
      }

      setStatus('Initializing Llama C++ Engine...');
      const llamaCtx = await initLlama({
        model: MODEL_PATH,
        n_ctx: 2048,
        n_threads: 4,
        n_gpu_layers: 0,
      });

      setContext(llamaCtx);
      setStatus('Model Ready!');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleGenerate = async () => {
    if (!context || !prompt) {
      return;
    }
    setOutput('');

    await context.completion(
      {
        prompt: `<|im_start|>user\n${prompt}<|im_end|>\n<|im_start|>assistant\n`,
        n_predict: 256,
        stop: ['<|im_end|>'],
      },
      data => {
        setOutput(prev => prev + data.token);
      },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>PocketPal Lite MVP</Text>
      <Text style={styles.status}>Status: {status}</Text>

      {!context && (
        <TouchableOpacity onPress={downloadAndInitModel} style={styles.button}>
          <Text style={styles.buttonText}>Load Test Model</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.outputBox}>
        <Text style={styles.outputText}>{output}</Text>
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          onChangeText={setPrompt}
          placeholder="Type prompt here..."
          placeholderTextColor="#888"
          style={styles.input}
          value={prompt}
        />
        <TouchableOpacity
          disabled={!context}
          onPress={handleGenerate}
          style={styles.sendButton}>
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#121212'},
  header: {fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 8},
  status: {color: '#aaa', marginBottom: 16},
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {color: '#fff', fontWeight: 'bold'},
  outputBox: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  outputText: {color: '#00FF66', fontSize: 14, fontFamily: 'monospace'},
  inputRow: {flexDirection: 'row', gap: 8},
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
});
