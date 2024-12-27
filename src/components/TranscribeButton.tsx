interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isModelLoading: boolean;
    isTranscribing: boolean;
    disabled?: boolean;
    className?: string;
}

export function TranscribeButton(props: Props): JSX.Element {
    const { isModelLoading, isTranscribing, onClick, disabled, className, ...buttonProps } = props;
    return (
        <button
            {...buttonProps}
            onClick={(event) => {
                if (onClick && !isTranscribing && !isModelLoading && !disabled) {
                    onClick(event);
                }
            }}
            disabled={isTranscribing || disabled}
            className={`
                relative group flex items-center justify-center gap-2 
                min-w-[180px] px-6 py-3 rounded-xl font-semibold text-sm
                transform transition-all duration-200 
                ${isModelLoading || isTranscribing
                    ? 'bg-green-600 hover:bg-green-700 animate-pulse-slow'
                    : disabled
                        ? 'bg-gray-300 cursor-not-allowed'
                        : className || 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-100'
                }
                shadow-lg hover:shadow-xl text-white
            `}
        >
            {isModelLoading ? (
                <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading Model...</span>
                </>
            ) : isTranscribing ? (
                <>
                    <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Transcribing...</span>
                </>
            ) : (
                <>
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span>Transcribe Audio</span>
                </>
            )}
        </button>
    );
}

export function RecordButton(props: {
    isRecording: boolean;
    onClick: () => void;
    disabled?: boolean;
}): JSX.Element {
    return (
        <button
            onClick={props.onClick}
            disabled={props.disabled}
            className={`
                relative group flex items-center justify-center gap-2
                min-w-[160px] px-6 py-3 rounded-xl font-semibold text-sm
                transform transition-all duration-200
                ${props.isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse-slow'
                    : props.disabled
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-100'
                }
                shadow-lg hover:shadow-xl text-white
            `}
        >
            {props.isRecording ? (
                <>
                    <span className="absolute left-0 top-0 h-full w-full overflow-hidden rounded-xl">
                        <span className="absolute -left-1 top-1/2 h-8 w-8 -translate-y-1/2 translate-x-0 animate-record-pulse rounded-full bg-red-400/30"></span>
                    </span>
                    <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
                    <span>Stop Recording</span>
                </>
            ) : (
                <>
                    <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                    <span>Start Recording</span>
                </>
            )}
        </button>
    );
}