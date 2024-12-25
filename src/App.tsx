import { AudioManager } from "./components/AudioManager";
import Transcript from "./components/Transcript";
import AIResponse from "./components/AIResponse";
import { useTranscriber } from "./hooks/useTranscriber";
import { useLlama } from "./hooks/useLlama";
import { useEffect } from "react";

// @ts-ignore
const IS_WEBGPU_AVAILABLE = !!navigator.gpu;

function App() {
    const transcriber = useTranscriber();
    const llama = useLlama();

    // Initialize Llama model immediately when component mounts
    useEffect(() => {
        console.log('🚀 Starting automatic Llama initialization...');
        const initializeLlama = async () => {
            try {
                await llama.initModel();
                console.log('✅ Llama initialized automatically on app load');
            } catch (error) {
                console.error('❌ Failed to initialize Llama:', error);
            }
        };

        initializeLlama();
    }, [llama.initModel]); // Add llama.initModel as dependency

    // Process transcription with Llama when transcription is complete
    useEffect(() => {
        if (transcriber.output && !transcriber.output.isBusy && transcriber.output.text) {
            console.log('🎯 New transcription detected, generating response...');
            llama.generateResponse(transcriber.output.text);
        }
    }, [transcriber.output, llama.generateResponse]);

    return IS_WEBGPU_AVAILABLE ? (
        <div className='flex justify-center items-center min-h-screen'>
            <div className='container flex flex-col justify-center items-center'>
                <h1 className='text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl text-center'>
                    Whisper WebGPU + Llama
                </h1>
                <h2 className='mt-3 mb-5 px-4 text-center text-1xl font-semibold tracking-tight text-slate-900 sm:text-2xl'>
                    ML-powered speech recognition with AI responses
                </h2>
                <AudioManager transcriber={transcriber} />
                <Transcript transcribedData={transcriber.output} />
                <AIResponse aiState={llama} />
            </div>
        </div>
    ) : (
        <div className='fixed w-screen h-screen bg-black z-10 bg-opacity-[92%] text-white text-2xl font-semibold flex justify-center items-center text-center'>
            WebGPU is not supported
            <br />
            by this browser :&#40;
        </div>
    );
}

export default App;
