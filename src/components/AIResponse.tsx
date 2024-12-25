import { LlamaResponse } from '../hooks/useLlama';

interface Props {
    aiState: LlamaResponse;
}

export default function AIResponse({ aiState }: Props) {
    if (!aiState.response && !aiState.isLoading && !aiState.error && !aiState.downloadProgress) {
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

            {aiState.isLoading && !aiState.downloadProgress && (
                <div className="animate-pulse-green bg-green-600 text-white rounded-lg p-4">
                    Loading AI response...
                </div>
            )}

            {aiState.error && (
                <div className="bg-red-100 text-red-700 rounded-lg p-4">
                    {aiState.error}
                </div>
            )}

            {aiState.response && !aiState.isLoading && (
                <div className="bg-blue-50 rounded-lg p-4 shadow-xl shadow-black/5 ring-1 ring-slate-700/10">
                    <h3 className="font-semibold mb-2">AI Response:</h3>
                    <p className="whitespace-pre-wrap">{aiState.response}</p>
                </div>
            )}
        </div>
    );
} 