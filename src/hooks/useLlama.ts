import { useState, useCallback } from 'react';
import { pipeline, env } from "@huggingface/transformers";

// Enable caching
env.cacheDir = './.cache';
env.localModelPath = './.cache';

export interface LlamaResponse {
    isLoading: boolean;
    response: string;
    error?: string;
    downloadProgress?: {
        status: string;
        loaded: number;
        total: number;
        progress: number;
    };
}

export function useLlama() {
    const [llamaState, setLlamaState] = useState<LlamaResponse>({
        isLoading: false,
        response: ''
    });

    const [model, setModel] = useState<any>(undefined);

    const initModel = useCallback(async () => {
        console.log('🦙 Checking model initialization status...');
        if (!model) {
            try {
                console.log('🦙 Starting model initialization...');
                setLlamaState(prev => ({ ...prev, isLoading: true }));
                const significantProgressPoints = [25, 50, 75, 99];

                const pipe = await pipeline(
                    'text-generation',
                    'onnx-community/Llama-3.2-1B-Instruct-q4f16',
                    {
                        device: 'webgpu',
                        progress_callback: (data: any) => {
                            const loaded = data.loaded || 0;
                            const total = data.total || 0;
                            const progress = Math.round((loaded / total) * 100);
                            const status = data.status || 'downloading';

                            if (significantProgressPoints.includes(progress)) {
                                console.log(`🦙 Model ${status}: ${progress}% (${(loaded / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB)`);
                            }

                            setLlamaState(prev => ({
                                ...prev,
                                downloadProgress: {
                                    status,
                                    loaded,
                                    total,
                                    progress
                                }
                            }));

                            // Save progress to localStorage
                            localStorage.setItem('llamaDownloadProgress', JSON.stringify({
                                status,
                                loaded,
                                total,
                                progress,
                                timestamp: Date.now()
                            }));
                        }
                    }
                );

                console.log('🦙 Pipeline created successfully');
                setModel(pipe);
                setLlamaState(prev => ({
                    ...prev,
                    isLoading: false,
                    downloadProgress: undefined
                }));
                console.log('🦙 Model initialization complete');

                // Save model initialization status
                localStorage.setItem('llamaModelInitialized', 'true');
                localStorage.setItem('llamaModelLastInit', Date.now().toString());

                return pipe;
            } catch (error) {
                console.error('🦙 Model initialization failed:', error);
                setLlamaState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Failed to load model',
                    downloadProgress: undefined
                }));
                throw error;
            }
        }
        return model;
    }, []);

    const generateResponse = useCallback(async (transcript: string) => {
        try {
            console.log('🦙 Attempting to generate response...');
            let currentModel = model;
            if (!currentModel) {
                console.log('🦙 Model not found, initializing...');
                currentModel = await initModel();
            }

            if (!currentModel) {
                console.error('🦙 Model initialization failed');
                return;
            }

            setLlamaState(prev => ({ ...prev, isLoading: true }));

            // Format the input as a string
            const messages = [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: transcript }
            ];

            console.log('🦙 Generating with messages:', messages);

            const result = await currentModel(messages, {
                max_new_tokens: 512,
                temperature: 0.7,
                top_p: 0.95,
                repetition_penalty: 1.1,
                do_sample: true
            });

            console.log('🦙 Response generated successfully:', result);
            setLlamaState(prev => ({
                ...prev,
                isLoading: false,
                response: result[0].generated_text
            }));
        } catch (error) {
            console.error('🦙 Error generating response:', error);
            setLlamaState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Failed to generate response'
            }));
        }
    }, [model, initModel]);

    return {
        ...llamaState,
        generateResponse,
        initModel
    };
} 