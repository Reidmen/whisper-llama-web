import { LlamaResponse } from '../hooks/useLlama';

interface Props {
    aiState: LlamaResponse;
}

export default function AIResponse({ aiState }: Props) {
    if (!aiState.response && !aiState.isLoading && !aiState.error) {
        return null;
    }

    return (
        <div className="w-full flex flex-col my-2 p-4">
            {aiState.isLoading && (
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