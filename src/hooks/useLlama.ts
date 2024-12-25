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
        console.log('🦙 Checking model initialization status...');
        if (!model) {
            try {
                console.log('🦙 Starting model initialization...');
                setLlamaState(prev => ({ ...prev, isLoading: true }));
                const pipe = await pipeline(
                    'text-generation',
                    'onnx-community/Llama-3.2-1B-Instruct-q4f16',
                    {
                        device: 'webgpu'
                    }
                );
                console.log('🦙 Pipeline created successfully');
                setModel(pipe);
                setLlamaState(prev => ({ ...prev, isLoading: false }));
                console.log('🦙 Model initialization complete');
                return pipe;
            } catch (error) {
                console.error('🦙 Model initialization failed:', error);
                setLlamaState(prev => ({
                    ...prev,
                    isLoading: false,
                    error: 'Failed to load model'
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
            const prompt = `<s>[INST] ${transcript} [/INST]`;
            console.log('🦙 Generating with prompt:', prompt);

            const result = await currentModel.generate(prompt, {
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