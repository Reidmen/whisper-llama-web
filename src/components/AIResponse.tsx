import { LlamaResponse, ChatMessage as ChatMessageLlama } from '../hooks/useLlama';

function Spinner() {
    return (
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                Loading...
            </span>
        </div>
    );
}

function ChatMessage({ message }: { message: ChatMessageLlama }) {
    return (
        <div className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'} mb-4`}>
            <div className={`max-w-[80%] rounded-lg p-4 ${message.role === 'assistant'
                ? 'bg-blue-50 text-slate-700'
                : 'bg-indigo-50 text-slate-700'
                }`}>
                <p className="text-sm font-semibold mb-1">
                    {message.role === 'assistant' ? 'AI Assistant' : 'You'}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                </p>
            </div>
        </div>
    );
}

export default function AIResponse({ aiState }: { aiState: LlamaResponse }) {
    if (!aiState.history.length && !aiState.isLoading && !aiState.error && !aiState.downloadProgress) {
        return null;
    }

    return (
        <div className="w-full flex flex-col my-2 p-4">
            {aiState.downloadProgress && (
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold mb-2">Downloading Model...</h3>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-2">
                        <div
                            className={`h-2.5 rounded-full transition-all duration-300 ${aiState.isLoading ? 'animate-pulse-green bg-green-600' : 'bg-blue-600'}`}
                            style={{ width: `${aiState.downloadProgress.progress || 0}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                        {`${((aiState.downloadProgress.loaded || 0) / 1024 / 1024).toFixed(2)}MB / ${((aiState.downloadProgress.total || 0) / 1024 / 1024).toFixed(2)}MB`}
                        {aiState.downloadProgress.total ? ` (${aiState.downloadProgress.progress || 0}%)` : ''}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">
                        Status: {aiState.downloadProgress.status || 'Initializing'}
                    </p>
                </div>
            )}

            <div className="flex flex-col space-y-4">
                {aiState.history.map((message, index) => (
                    <ChatMessage key={`${message.timestamp}-${index}`} message={message} />
                ))}
            </div>

            {aiState.isLoading && !aiState.downloadProgress && (
                <div className="flex items-center space-x-2 bg-green-50 text-green-700 rounded-lg p-4">
                    <Spinner />
                    <span>🦙 Generating response...</span>
                </div>
            )}

            {aiState.error && (
                <div className="bg-red-100 text-red-700 rounded-lg p-4">
                    {aiState.error}
                </div>
            )}
        </div>
    );
} 