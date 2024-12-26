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
            <div className='flex flex-col justify-center items-center rounded-lg bg-white shadow-xl shadow-black/5 ring-1 ring-slate-700/10'>
                <div className='flex flex-row space-x-2 py-2 px-2'>
                    {/* <VerticalBar />
                    <FileTile
                        icon={<FolderIcon />}
                        text={"From file"}
                        onFileUpdate={(decoded, blobUrl, mimeType) => {
                            props.transcriber.onInputChange();
                            setHasRecorded(false);
                            setAudioData({
                                buffer: decoded,
                                url: blobUrl,
                                source: AudioSource.FILE,
                                mimeType: mimeType,
                            });
                        }}
                    /> */}
                    {navigator.mediaDevices && (
                        <>
                            <VerticalBar />
                            <RecordTile
                                icon={<MicrophoneIcon />}
                                text={"Record"}
                                setAudioData={setAudioFromRecording}
                            />
                            <TranscribeButton
                                onClick={() => {
                                    audioData && props.transcriber.start(audioData.buffer);
                                }}
                                isModelLoading={props.transcriber.isModelLoading}
                                isTranscribing={props.transcriber.isBusy}
                                disabled={!audioData || !hasRecorded}
                                className={`${(!audioData || !hasRecorded) ? 'bg-red-500 hover:bg-red-600' : ''}`}
                            />
                        </>
                    )}
                </div>
                <AudioDataBar
                    progress={progress !== undefined && audioData ? 1 : (progress ?? 0)}
                />
            </div>

            {audioData && (
                <>
                    {props.transcriber.progressItems.length > 0 && (
                        <div className='relative z-10 p-4 w-full text-center'>
                            <label>
                                Loading model files... (only run once)
                            </label>
                            {props.transcriber.progressItems.map((data) => (
                                <div key={data.file}>
                                    <Progress
                                        text={data.file}
                                        percentage={data.progress}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <SettingsTile
                className='absolute bottom-4 right-4'
                transcriber={props.transcriber}
                icon={<SettingsIcon />}
            />
        </>
    );
}

function SettingsTile(props: {
    icon: JSX.Element;
    className?: string;
    transcriber: Transcriber;
}) {
    const [showModal, setShowModal] = useState(false);

    const onClick = () => {
        setShowModal(true);
    };

    const onClose = () => {
        setShowModal(false);
    };

    const onSubmit = () => {
        onClose();
    };

    return (
        <div className={props.className}>
            <Tile icon={props.icon} onClick={onClick} />
            <SettingsModal
                show={showModal}
                onSubmit={onSubmit}
                onClose={onClose}
                transcriber={props.transcriber}
            />
        </div>
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
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Save Settings
                </div>
            }
            submitClassName="bg-blue-600 hover:bg-blue-700 text-white"
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

    const onClick = () => {
        setShowModal(true);
    };

    const onClose = () => {
        setShowModal(false);
    };

    const onSubmit = (data: Blob | undefined) => {
        if (data) {
            props.setAudioData(data);
            onClose();
        }
    };

    return (
        <>
            <Tile icon={props.icon} text={props.text} onClick={onClick} />
            <RecordModal
                show={showModal}
                onSubmit={onSubmit}
                onProgress={(_data) => { }}
                onClose={onClose}
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
                <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-xl font-semibold">Record Your Voice</span>
                </div>
            }
            content={
                <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Recording Tips:</span>
                        </div>
                        <ul className="text-sm text-blue-600 ml-7 list-disc space-y-1">
                            <li>Speak clearly and at a normal pace</li>
                            <li>Keep background noise to a minimum</li>
                            <li>Stay close to your microphone</li>
                        </ul>
                    </div>

                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <AudioRecorder
                            onRecordingProgress={(blob) => {
                                props.onProgress(blob);
                            }}
                            onRecordingComplete={onRecordingComplete}
                        />
                    </div>

                    {audioBlob && (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm font-medium">Recording ready to load</span>
                        </div>
                    )}
                </div>
            }
            onClose={onClose}
            submitText={
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                    </svg>
                    {audioBlob ? "Load Recording" : "Record First"}
                </div>
            }
            submitEnabled={audioBlob !== undefined}
            submitClassName={`${audioBlob ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'} text-white px-4 py-2 rounded-lg transition-colors duration-200`}
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
            className='flex items-center justify-center rounded-lg p-2 bg-blue text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200'
        >
            <div className='w-4 h-4'>{props.icon}</div>
            {props.text && (
                <div className='ml-2 break-text text-center text-md w-30'>
                    {props.text}
                </div>
            )}
        </button>
    );
}


function SettingsIcon() {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth='1.25'
            stroke='currentColor'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z'
            />
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
            />
        </svg>
    );
}

function MicrophoneIcon() {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={1.5}
            stroke='currentColor'
        >
            <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z'
            />
        </svg>
    );
}
