import { AudioManager } from "./components/AudioManager";
import Transcript from "./components/Transcript";
import AIResponse from "./components/AIResponse";
import { useTranscriber } from "./hooks/useTranscriber";
import { useLlama } from "./hooks/useLlama";
import { useEffect, useRef, useState } from "react";

// @ts-ignore
const IS_WEBGPU_AVAILABLE = !!navigator.gpu;

function App() {
    const transcriber = useTranscriber();
    const llama = useLlama();
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(true);
    const [hasUserConsented, setHasUserConsented] = useState(false);

    const handleAcceptDownload = () => {
        setHasUserConsented(true);
        setShowPermissionPrompt(false);
    };

    // Add ref for the messages container
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Add auto-scroll effect
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [llama.response]); // Scroll when new response is added

    // Only initialize Llama after user consent
    useEffect(() => {
        if (hasUserConsented) {
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
        }
    }, [hasUserConsented, llama.initModel]);

    // Process transcription with Llama when transcription is complete
    useEffect(() => {
        if (transcriber.output && !transcriber.output.isBusy && transcriber.output.text) {
            console.log('🎯 New transcription detected, generating response...');
            llama.generateResponse(transcriber.output.text);
        }
    }, [transcriber.output, llama.generateResponse]);

    return IS_WEBGPU_AVAILABLE ? (
        <>
            {showPermissionPrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg max-w-md shadow-xl">
                        <div className="flex items-center gap-2 mb-6">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h2 className="text-xl font-bold">Download Permission Required</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <h3 className="font-semibold">Llama 3.2 1B</h3>
                                </div>
                                <p className="text-sm text-gray-600 ml-8">
                                    • Text generation model (~1GB)<br />
                                    • Powers the AI chat responses<br />
                                    • Runs entirely in your browser
                                </p>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-center gap-3 mb-2">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                    <h3 className="font-semibold">Whisper Base</h3>
                                </div>
                                <p className="text-sm text-gray-600 ml-8">
                                    • Speech recognition model (~150MB)<br />
                                    • Converts your voice to text<br />
                                    • Local processing for privacy
                                </p>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <p className="text-sm text-blue-800">
                                        Downloads directly from HuggingFace.<br />
                                        No personal data collection.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-6">
                            <button
                                onClick={() => setShowPermissionPrompt(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAcceptDownload}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Accept & Download
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className='flex justify-center items-center min-h-screen'>
                <div className='container flex flex-col justify-between min-h-screen'>
                    <div className='flex-1 overflow-y-auto'>
                        <h3 className='text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl text-center mt-4 sticky top-0 bg-white'>
                            Whisper WebGPU + Llama 3.2 🦙 (Fully Secret)
                        </h3>
                        <div className='overflow-y-auto h-[calc(100vh-200px)]'>
                            <AIResponse aiState={llama} />
                            <div ref={messagesEndRef} /> {/* Scroll anchor */}
                        </div>
                    </div>
                    <div className='sticky bottom-0 bg-white pb-4'>
                        <AudioManager transcriber={transcriber} />
                        <Transcript transcribedData={transcriber.output} />
                        <p className='text-center text-sm text-gray-500 mt-4 hover:text-blue-600 transition-colors duration-300'>
                            Created by 🔮 <a href="https://github.com/Reidmen" target="_blank" rel="noopener noreferrer" className="font-semibold underline hover:text-blue-800">Reidmen</a> 🚀, Template and inspiration by <a href="https://github.com/xenova" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">Xenova</a>
                        </p>
                    </div>
                </div>
            </div>
        </>
    ) : (
        <div className='fixed w-screen h-screen bg-black z-10 bg-opacity-[92%] text-white text-2xl font-semibold flex justify-center items-center text-center'>
            WebGPU is not supported
            <br />
            by this browser :&#40;
        </div>
    );
}

export default App;
