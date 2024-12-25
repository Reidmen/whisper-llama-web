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
    }, [llama.initModel]);

    // Process transcription with Llama when transcription is complete
    useEffect(() => {
        if (transcriber.output && !transcriber.output.isBusy && transcriber.output.text) {
            console.log('🎯 New transcription detected, generating response...');
            llama.generateResponse(transcriber.output.text);
        }
    }, [transcriber.output, llama.generateResponse]);

    return IS_WEBGPU_AVAILABLE ? (
        <div className='flex justify-center items-center min-h-screen'>
            <div className='container flex flex-col justify-between min-h-screen'>
                <div className='flex-1 overflow-y-auto'>
                    <h3 className='text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl text-center mt-4'>
                        Whisper WebGPU + Llama 3.2
                    </h3>
                    <AIResponse aiState={llama} />
                </div>
                <div className='sticky bottom-0 bg-white pb-4'>
                    <AudioManager transcriber={transcriber} />
                    <Transcript transcribedData={transcriber.output} />
                </div>
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
