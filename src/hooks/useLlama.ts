import { useState, useCallback, useRef } from 'react';
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

    const modelRef = useRef<any>(null);

    const initModel = useCallback(async () => {
        console.log('🦙 Checking model initialization status...');
        if (!modelRef.current) {
            try {
                console.log('🦙 Starting model initialization...');
                setLlamaState(prev => ({ ...prev, isLoading: true }));

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

                            setLlamaState(prev => ({
                                ...prev,
                                downloadProgress: {
                                    status,
                                    loaded,
                                    total,
                                    progress
                                }
                            }));
                        }
                    }
                );

                modelRef.current = pipe;
                setLlamaState(prev => ({
                    ...prev,
                    isLoading: false,
                    downloadProgress: undefined
                }));
                console.log('🦙 Model initialization complete');
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
        return modelRef.current;
    }, []);

    const generateResponse = useCallback(async (transcript: string) => {
        try {
            console.log('🦙 Attempting to generate response from transcript:', transcript);
            let currentModel = modelRef.current;
            if (!currentModel) {
                console.log('🦙 Model not found, initializing...');
                currentModel = await initModel();
            }

            if (!currentModel) {
                console.error('🦙 Model initialization failed');
                return;
            }

            setLlamaState(prev => ({
                ...prev,
                isLoading: true,
                error: undefined, // Clear any previous errors
                response: '' // Clear previous response
            }));

            // Format the prompt for better instruction following
            const formattedPrompt = [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: transcript }
            ];

            console.log('🦙 Generating with prompt:', formattedPrompt);

            const result = await (await currentModel)(formattedPrompt, {
                max_new_tokens: 256, // Increased for more detailed responses
                temperature: 0.7,
                top_p: 0.95,
                repetition_penalty: 1.1
            });

            const generatedText = result[0].generated_text.at(-1).content;

            console.log('🦙 Response generated successfully:', generatedText);
            setLlamaState(prev => ({
                ...prev,
                isLoading: false,
                response: generatedText
            }));
        } catch (error) {
            console.error('🦙 Error generating response:', error);
            setLlamaState(prev => ({
                ...prev,
                isLoading: false,
                error: 'Failed to generate response',
                response: ''
            }));
        }
    }, [initModel]);

    return {
        ...llamaState,
        generateResponse,
        initModel
    };
} 