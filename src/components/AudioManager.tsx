import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "./modal/Modal";
import { TranscribeButton } from "./TranscribeButton";
import Constants from "../utils/Constants";
import { Transcriber } from "../hooks/useTranscriber";
import Progress from "./Progress";
import AudioRecorder from "./AudioRecorder";
import { env } from '@huggingface/transformers';

// Configure caching settings at the top of the file
env.useBrowserCache = true; // Enable browser caching
env.cacheDir = './.cache'; // Set cache directory (optional)
env.allowLocalModels = true; // Allow loading cached models

function titleCase(str: string) {
    str = str.toLowerCase();
    return (str.match(/\w+.?/g) || [])
        .map((word) => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join("");
}

// List of supported languages:
// https://help.openai.com/en/articles/7031512-whisper-api-faq
// https://github.com/openai/whisper/blob/248b6cb124225dd263bb9bd32d060b6517e067f8/whisper/tokenizer.py#L79
const LANGUAGES = {
    en: "english",
    zh: "chinese",
    de: "german",
    es: "spanish/castilian",
    ru: "russian",
    ko: "korean",
    fr: "french",
    ja: "japanese",
    pt: "portuguese",
    tr: "turkish",
    pl: "polish",
    ca: "catalan/valencian",
    nl: "dutch/flemish",
    ar: "arabic",
    sv: "swedish",
    it: "italian",
    id: "indonesian",
    hi: "hindi",
    fi: "finnish",
    vi: "vietnamese",
    he: "hebrew",
    uk: "ukrainian",
    el: "greek",
    ms: "malay",
    cs: "czech",
    ro: "romanian/moldavian/moldovan",
    da: "danish",
    hu: "hungarian",
    ta: "tamil",
    no: "norwegian",
    th: "thai",
    ur: "urdu",
    hr: "croatian",
    bg: "bulgarian",
    lt: "lithuanian",
    la: "latin",
    mi: "maori",
    ml: "malayalam",
    cy: "welsh",
    sk: "slovak",
    te: "telugu",
    fa: "persian",
    lv: "latvian",
    bn: "bengali",
    sr: "serbian",
    az: "azerbaijani",
    sl: "slovenian",
    kn: "kannada",
    et: "estonian",
    mk: "macedonian",
    br: "breton",
    eu: "basque",
    is: "icelandic",
    hy: "armenian",
    ne: "nepali",
    mn: "mongolian",
    bs: "bosnian",
    kk: "kazakh",
    sq: "albanian",
    sw: "swahili",
    gl: "galician",
    mr: "marathi",
    pa: "punjabi/panjabi",
    si: "sinhala/sinhalese",
    km: "khmer",
    sn: "shona",
    yo: "yoruba",
    so: "somali",
    af: "afrikaans",
    oc: "occitan",
    ka: "georgian",
    be: "belarusian",
    tg: "tajik",
    sd: "sindhi",
    gu: "gujarati",
    am: "amharic",
    yi: "yiddish",
    lo: "lao",
    uz: "uzbek",
    fo: "faroese",
    ht: "haitian creole/haitian",
    ps: "pashto/pushto",
    tk: "turkmen",
    nn: "nynorsk",
    mt: "maltese",
    sa: "sanskrit",
    lb: "luxembourgish/letzeburgesch",
    my: "myanmar/burmese",
    bo: "tibetan",
    tl: "tagalog",
    mg: "malagasy",
    as: "assamese",
    tt: "tatar",
    haw: "hawaiian",
    ln: "lingala",
    ha: "hausa",
    ba: "bashkir",
    jw: "javanese",
    su: "sundanese",
};

const MODELS = Object.entries({
    // Original checkpoints
    "onnx-community/whisper-tiny": 120, // 33 + 87
    "onnx-community/whisper-base": 206, // 83 + 123
    "onnx-community/whisper-small": 586, // 353 + 233
    "onnx-community/whisper-large-v3-turbo": 1604, // 1270 + 334

    // Distil Whisper (English-only)
    "onnx-community/distil-small.en": 538, // 353 + 185
});

// Use one single audio source, remove url and file
export enum AudioSource {
    URL = "URL",
    FILE = "FILE",
    RECORDING = "RECORDING",
}

export function AudioManager(props: { transcriber: Transcriber }) {
    const [progress, setProgress] = useState<number | undefined>(0);
    const [audioData, setAudioData] = useState<
        | {
            buffer: AudioBuffer;
            url: string;
            source: AudioSource;
            mimeType: string;
        }
        | undefined
    >(undefined);
    const [audioDownloadUrl, setAudioDownloadUrl] = useState<
        string | undefined
    >(undefined);
    const [hasRecorded, setHasRecorded] = useState<boolean>(false);

    const resetAudio = () => {
        setAudioData(undefined);
        setAudioDownloadUrl(undefined);
        setHasRecorded(false);
    };

    const setAudioFromDownload = async (
        data: ArrayBuffer,
        mimeType: string,
    ) => {
        const audioCTX = new AudioContext({
            sampleRate: Constants.SAMPLING_RATE,
        });
        const blobUrl = URL.createObjectURL(
            new Blob([data], { type: "audio/*" }),
        );
        const decoded = await audioCTX.decodeAudioData(data);
        setAudioData({
            buffer: decoded,
            url: blobUrl,
            source: AudioSource.URL,
            mimeType: mimeType,
        });
    };

    const setAudioFromRecording = async (data: Blob) => {
        resetAudio();
        setProgress(0);
        setHasRecorded(true);
        const blobUrl = URL.createObjectURL(data);
        const fileReader = new FileReader();
        fileReader.onprogress = (event) => {
            setProgress(event.loaded / event.total || 0);
        };
        fileReader.onloadend = async () => {
            const audioCTX = new AudioContext({
                sampleRate: Constants.SAMPLING_RATE,
            });
            const arrayBuffer = fileReader.result as ArrayBuffer;
            const decoded = await audioCTX.decodeAudioData(arrayBuffer);
            setProgress(undefined);
            setAudioData({
                buffer: decoded,
                url: blobUrl,
                source: AudioSource.RECORDING,
                mimeType: data.type,
            });
        };
        fileReader.readAsArrayBuffer(data);
    };

    const downloadAudioFromUrl = async (
        requestAbortController: AbortController,
    ) => {
        if (audioDownloadUrl) {
            try {
                setAudioData(undefined);
                setProgress(0);
                const { data, headers } = (await axios.get(audioDownloadUrl, {
                    signal: requestAbortController.signal,
                    responseType: "arraybuffer",
                    onDownloadProgress(progressEvent) {
                        setProgress(progressEvent.progress || 0);
                    },
                })) as {
                    data: ArrayBuffer;
                    headers: { "content-type": string };
                };

                let mimeType = headers["content-type"];
                if (!mimeType || mimeType === "audio/wave") {
                    mimeType = "audio/wav";
                }
                setAudioFromDownload(data, mimeType);
            } catch (error) {
                console.log("Request failed or aborted", error);
                setProgress(undefined);
            }
        }
    };

    // When URL changes, download audio
    useEffect(() => {
        if (audioDownloadUrl) {
            const requestAbortController = new AbortController();
            downloadAudioFromUrl(requestAbortController);
            return () => {
                requestAbortController.abort();
            };
        }
    }, [audioDownloadUrl]);

    return (
        <>
            <div className='flex flex-col gap-4 w-full max-w-2xl mx-auto'>
                {/* Main Control Panel */}
                <div className='relative overflow-hidden rounded-xl bg-white shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl'>
                    {/* Recording Controls */}
                    <div className='flex items-center justify-center p-4 gap-4'>
                        {navigator.mediaDevices && (
                            <>
                                <RecordTile
                                    icon={<MicrophoneIcon />}
                                    text="Record"
                                    setAudioData={setAudioFromRecording}
                                />
                                <TranscribeButton
                                    onClick={() => audioData && props.transcriber.start(audioData.buffer)}
                                    isModelLoading={props.transcriber.isModelLoading}
                                    isTranscribing={props.transcriber.isBusy}
                                    disabled={!audioData || !hasRecorded}
                                    className={`
                                        flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-300
                                        ${(!audioData || !hasRecorded)
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg active:scale-95'
                                        }
                                    `}
                                />
                            </>
                        )}
                    </div>

                    {/* Progress Bar */}
                    <div className='px-4 pb-4'>
                        <div className='relative h-2 bg-gray-100 rounded-full overflow-hidden'>
                            <div
                                className={`
                                    absolute h-full left-0 top-0 rounded-full
                                    ${audioData ? 'bg-green-500' : 'bg-indigo-500'}
                                    transition-all duration-300 ease-out
                                `}
                                style={{
                                    width: `${Math.round((progress !== undefined && audioData ? 1 : (progress ?? 0)) * 100)}%`,
                                }}
                            />
                        </div>
                    </div>

                    {/* Status Indicator */}
                    {(audioData || progress !== undefined) && (
                        <div className='absolute top-2 right-2'>
                            <span className={`
                                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                ${audioData
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }
                            `}>
                                {audioData ? 'Ready' : 'Processing...'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Model Loading Progress */}
                {audioData && props.transcriber.progressItems.length > 0 && (
                    <div className='bg-white rounded-xl p-6 shadow-lg border border-gray-100'>
                        <div className='flex items-center gap-2 mb-4 text-indigo-600'>
                            <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className='font-medium'>Loading model files...</span>
                            <span className='text-sm text-gray-500'>(one-time process)</span>
                        </div>

                        <div className='space-y-3'>
                            {props.transcriber.progressItems.map((data) => (
                                <Progress
                                    key={data.file}
                                    text={data.file}
                                    percentage={data.progress}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Settings Button */}
                <div className='fixed bottom-6 right-6'>
                    <SettingsTile
                        icon={<SettingsIcon />}
                        transcriber={props.transcriber}
                        className="group p-3 bg-white rounded-full shadow-lg hover:shadow-xl 
                                 border border-gray-100 transition-all duration-300
                                 hover:bg-indigo-50 active:scale-95"
                    />
                </div>
            </div>
        </>
    );
}

function SettingsTile(props: {
    icon: JSX.Element;
    className?: string;
    transcriber: Transcriber;
}) {
    const [showModal, setShowModal] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    relative group flex items-center justify-center
                    p-3 rounded-full 
                    bg-white shadow-lg hover:shadow-xl
                    border border-gray-100
                    transition-all duration-300
                    hover:bg-indigo-50 active:scale-95
                    ${props.className || ''}
                `}
                data-settings-tile
            >
                {/* Ripple effect on hover */}
                <div className={`
                    absolute inset-0 rounded-full
                    bg-indigo-100 opacity-0 scale-90
                    transition-all duration-300 ease-out
                    ${isHovered ? 'opacity-50 scale-105' : ''}
                `} />

                {/* Icon container */}
                <div className="relative flex items-center gap-2">
                    <div className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 transition-colors duration-200">
                        {props.icon}
                    </div>

                    {/* Tooltip */}
                    <div className={`
                        absolute right-full mr-3 whitespace-nowrap
                        px-2 py-1 rounded-lg text-xs font-medium
                        bg-gray-800 text-white
                        opacity-0 -translate-x-2
                        transition-all duration-200
                        ${isHovered ? 'opacity-100 translate-x-0' : ''}
                    `}>
                        Configure Settings
                        {/* Tooltip arrow */}
                        <div className="absolute top-1/2 right-0 -mt-1
                                      border-4 border-transparent 
                                      border-l-gray-800" />
                    </div>
                </div>

                {/* Status indicator */}
                {props.transcriber.multilingual && (
                    <div className="absolute -top-1 -right-1 
                                  w-3 h-3 rounded-full
                                  bg-indigo-500 border-2 border-white
                                  transition-transform duration-200
                                  group-hover:scale-125" />
                )}
            </button>

            <SettingsModal
                show={showModal}
                onSubmit={() => setShowModal(false)}
                onClose={() => setShowModal(false)}
                transcriber={props.transcriber}
            />
        </>
    );
}

function SettingsModal(props: {
    show: boolean;
    onSubmit: (url: string) => void;
    onClose: () => void;
    transcriber: Transcriber;
}) {
    const names = Object.values(LANGUAGES).map(titleCase);
    const models = MODELS.filter(
        ([key, _value]) =>
            !props.transcriber.multilingual || !key.includes("/distil-"),
    ).map(([key, value]) => ({
        key,
        size: value,
        id: `${key}${props.transcriber.multilingual || key.includes("/distil-") ? "" : ".en"}`,
    }));

    return (
        <Modal
            show={props.show}
            title={
                <div className="flex items-center gap-3 mb-2">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xl font-semibold">Settings</span>
                </div>
            }
            content={
                <div className="space-y-6">
                    {/* Model Selection Card */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <label className="font-medium text-gray-900">Model Selection</label>
                        </div>
                        <select
                            className='w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200'
                            value={props.transcriber.model}
                            onChange={(e) => props.transcriber.setModel(e.target.value)}
                        >
                            {models.map(({ key, id, size }) => (
                                <option
                                    key={key}
                                    value={id}
                                    className={`${id === props.transcriber.model ? 'bg-green-100 text-green-800' : ''}`}
                                >
                                    {`${id} (${size}MB)`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Multilingual Support Toggle */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                </svg>
                                <label htmlFor="multilingual" className="font-medium text-gray-900">
                                    Multilingual Support
                                </label>
                            </div>
                            <input
                                id='multilingual'
                                type='checkbox'
                                checked={props.transcriber.multilingual}
                                onChange={(e) => {
                                    let model = Constants.DEFAULT_MODEL;
                                    if (!e.target.checked) {
                                        model += ".en";
                                    }
                                    props.transcriber.setModel(model);
                                    props.transcriber.setMultilingual(e.target.checked);
                                }}
                                className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 transition-colors duration-200"
                            />
                        </div>
                    </div>

                    {props.transcriber.multilingual && (
                        <div className="space-y-4">
                            {/* Language Selection */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                    </svg>
                                    <label className="font-medium text-gray-900">Language</label>
                                </div>
                                <select
                                    className='w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200'
                                    value={props.transcriber.language}
                                    onChange={(e) => props.transcriber.setLanguage(e.target.value)}
                                >
                                    {names.map((name) => (
                                        <option key={name} value={name.toLowerCase()}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Task Selection */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    <label className="font-medium text-gray-900">Task</label>
                                </div>
                                <select
                                    className='w-full p-2.5 bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200'
                                    value={props.transcriber.subtask}
                                    onChange={(e) => props.transcriber.setSubtask(e.target.value)}
                                >
                                    <option value="transcribe">Transcribe</option>
                                    <option value="translate">Translate to English</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            }
            onClose={props.onClose}
            submitText={
                <div className="flex items-center justify-center w-full gap-2 group">
                    <svg
                        className="w-4 h-4 transition-colors duration-200 group-hover:text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    <span className="font-medium">Save Settings</span>
                </div>
            }
            submitClassName="w-full bg-blue-600 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-all duration-300 flex items-center justify-center active:bg-green-700 active:scale-95"
            onSubmit={() => props.onSubmit("")}
        />
    );
}

function VerticalBar() {
    return <div className='w-[1px] bg-slate-200'></div>;
}

function AudioDataBar(props: { progress: number }) {
    return <ProgressBar progress={`${Math.round(props.progress * 100)}%`} />;
}

function ProgressBar(props: { progress: string }) {
    return (
        <div className='w-full rounded-full h-1 bg-gray-200 dark:bg-gray-700'>
            <div
                className='bg-blue-600 h-1 rounded-full transition-all duration-100'
                style={{ width: props.progress }}
            ></div>
        </div>
    );
}

function RecordTile(props: {
    icon: JSX.Element;
    text: string;
    setAudioData: (data: Blob) => void;
}) {
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="group flex items-center gap-2 py-3 px-4 bg-white rounded-lg
                         text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 
                         shadow-sm hover:shadow border border-gray-100
                         transition-all duration-200 active:scale-95"
            >
                <div className="w-5 h-5">
                    {props.icon}
                </div>
                <span className="font-medium text-sm">
                    {props.text}
                </span>
            </button>
            <RecordModal
                show={showModal}
                onSubmit={(data) => {
                    if (data) {
                        props.setAudioData(data);
                        setShowModal(false);
                    }
                }}
                onProgress={() => { }}
                onClose={() => setShowModal(false)}
            />
        </>
    );
}

function RecordModal(props: {
    show: boolean;
    onProgress: (data: Blob | undefined) => void;
    onSubmit: (data: Blob | undefined) => void;
    onClose: () => void;
}) {
    const [audioBlob, setAudioBlob] = useState<Blob>();

    const onRecordingComplete = (blob: Blob) => {
        setAudioBlob(blob);
    };

    const onSubmit = () => {
        props.onSubmit(audioBlob);
        setAudioBlob(undefined);
    };

    const onClose = () => {
        props.onClose();
        setAudioBlob(undefined);
    };

    return (
        <Modal
            show={props.show}
            title={
                <div className="flex items-center gap-3 mb-2">
                    <div className="relative">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    </div>
                    <span className="text-xl font-semibold">Voice Recorder</span>
                </div>
            }
            content={
                <div className="space-y-6">
                    {/* Tips Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-indigo-700 mb-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Quick Tips</span>
                        </div>
                        <ul className="text-sm text-indigo-600 ml-7 list-disc space-y-1.5">
                            <li className="transition-all duration-200 hover:translate-x-1">Speak clearly at a normal pace</li>
                            <li className="transition-all duration-200 hover:translate-x-1">Minimize background noise</li>
                            <li className="transition-all duration-200 hover:translate-x-1">Keep microphone close</li>
                        </ul>
                    </div>

                    {/* Recorder Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col items-center">
                            <AudioRecorder
                                onRecordingProgress={(blob) => props.onProgress(blob)}
                                onRecordingComplete={onRecordingComplete}
                            />
                        </div>
                    </div>

                    {/* Status Indicator */}
                    {audioBlob && (
                        <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></div>
                                </div>
                                <span className="text-sm font-medium text-green-700">Recording ready!</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-xs text-green-600 hover:text-green-700 underline underline-offset-2"
                            >
                                Record again
                            </button>
                        </div>
                    )}
                </div>
            }
            onClose={onClose}
            submitText={
                <div className="flex items-center justify-center w-full gap-2 group">
                    {audioBlob ? (
                        <>
                            <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                            </svg>
                            <span className="font-medium">Load Recording</span>
                        </>
                    ) : (
                        <span className="font-medium">Start Recording</span>
                    )}
                </div>
            }
            submitEnabled={audioBlob !== undefined}
            submitClassName={`
                w-full px-6 py-3 rounded-xl transition-all duration-300 
                ${audioBlob
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-md hover:shadow-lg active:scale-98'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }
            `}
            onSubmit={onSubmit}
        />
    );
}

function Tile(props: {
    icon: JSX.Element;
    text?: string;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={props.onClick}
            className='group flex items-center justify-center rounded-xl p-3 bg-white text-slate-600 
                     hover:text-indigo-600 hover:bg-indigo-50 active:scale-95
                     shadow-sm hover:shadow border border-gray-100
                     transition-all duration-200'
        >
            <div className='w-5 h-5 transition-transform duration-200 group-hover:scale-110'>
                {props.icon}
            </div>
            {props.text && (
                <div className='ml-2 font-medium text-sm'>
                    {props.text}
                </div>
            )}
        </button>
    );
}


function SettingsIcon() {
    return (
        <svg
            className="w-full h-full transition-colors duration-200"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g className="opacity-0 hover:opacity-100 transition-opacity duration-300">
                <circle cx="12" cy="12" r="10" className="animate-pulse" fill="currentColor" fillOpacity="0.1" />
            </g>
            <path
                className="transition-transform duration-300 origin-center hover:rotate-90"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                stroke="currentColor"
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
            />
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                stroke="currentColor"
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
            />
        </svg>
    );
}

function MicrophoneIcon() {
    return (
        <svg
            className="w-full h-full transition-colors duration-200"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Pulse effect circle */}
            <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <circle
                    cx="12"
                    cy="12"
                    r="10"
                    className="animate-pulse"
                    fill="currentColor"
                    fillOpacity="0.1"
                />
            </g>

            {/* Microphone body */}
            <path
                className="transition-all duration-300 origin-center group-hover:scale-105"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                stroke="currentColor"
                d="M12 15.75a4 4 0 004-4V6a4 4 0 00-8 0v5.75a4 4 0 004 4z"
            />

            {/* Sound waves */}
            <path
                className="transition-opacity duration-300 group-hover:opacity-100 opacity-70"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                stroke="currentColor"
                d="M8 9.75v2a4 4 0 008 0v-2"
            />

            {/* Stand */}
            <path
                className="transition-all duration-300 origin-bottom group-hover:scale-y-110"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                stroke="currentColor"
                d="M12 15.75V19m-4 2h8"
            />
        </svg>
    );
}
