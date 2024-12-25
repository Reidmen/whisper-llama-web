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
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${aiState.downloadProgress.progress}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                        {`${(aiState.downloadProgress.loaded / 1024 / 1024).toFixed(2)}MB / ${(aiState.downloadProgress.total / 1024 / 1024).toFixed(2)}MB`}
                        {` (${aiState.downloadProgress.progress}%)`}
                    </p>
                    <p className="text-sm text-gray-600 capitalize">
                        Status: {aiState.downloadProgress.status}
                    </p>
                </div>
            )}

            {aiState.isLoading && !aiState.downloadProgress && (
                <div className="animate-pulse bg-gray-100 rounded-lg p-4">
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