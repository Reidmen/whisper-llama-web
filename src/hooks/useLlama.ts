import { useState, useCallback } from 'react';
import { pipeline } from "@huggingface/transformers";

export interface LlamaResponse {
    isLoading: boolean;
    response: string;
    error?: string;
}

export function useLlama() {
    const [llamaState, setLlamaState] = useState<LlamaResponse>({
        isLoading: false,
        response: ''
    });

    const [model, setModel] = useState<any>(null);

    const initModel = useCallback(async () => {
        if (!model) {
            try {
                console.log('🦙 Initializing Llama model...');
                setLlamaState(prev => ({ ...prev, isLoading: true }));
                const pipe = await pipeline(
                    'text-generation',
                    'onnx-community/Llama-3.2-1B-Instruct-q4f16',
                    {
                        device: 'webgpu'
                    }
                );
                console.log('🦙 Llama model loaded successfully');
                setModel(pipe);
                setLlamaState(prev => ({ ...prev, isLoading: false }));
            } catch (error) {
                setLlamaState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Failed to load model'
                }));
            }
        }
    }, [model]);

    const generateResponse = useCallback(async (transcript: string) => {
        if (!model) {
            console.log('🦙 Model not initialized, skipping response generation');
            return;
        }

        try {
            console.log('🦙 Generating response for transcript:', transcript);
            setLlamaState(prev => ({ ...prev, isLoading: true }));

            const prompt = `<s>[INST] ${transcript} [/INST]`;
            console.log('🦙 Using prompt:', prompt);
            const result = await model.generate(prompt, {
                max_new_tokens: 512,
                temperature: 0.7,
                top_p: 0.95,
                repetition_penalty: 1.1,
                do_sample: true
            });

            console.log('🦙 Response generated successfully');
            setLlamaState(prev => ({
                ...prev,
                isLoading: false,
                response: result[0].generated_text
            }));
        } catch (error) {
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