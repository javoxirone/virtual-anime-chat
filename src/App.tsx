import { useRef, useState } from "react";
import VideoStage from "./VideoStage";
import { useSpeech } from "./useSpeech";
import type { ChatState, VideoKey } from "./types";


export default function App() {
    const [state, setState] = useState<ChatState>("idle");
    const [transcript, setTranscript] = useState("");

    const playVideoRef = useRef<((key: VideoKey) => void) | null>(null);

    const { start, stop } = useSpeech(handleSpeech);

    function handleSpeech(text: string): void {
        if (text === "__error__") {
            playResponse("fallback");
            return;
        }

        setTranscript(text);

        if (text.includes("bye") || text.includes("goodbye")) {
            setState("goodbye");
            return;
        }

        if (text.includes("hello") || text.includes("hi")) {
            playResponse("general");
            return;
        }

        if (text.includes("weather") || text.includes("today")) {
            playResponse("weather");
            return;
        }

        if (text.includes("task") || text.includes("easter egg")) {
            playResponse("easter_egg")
            return;
        }

        playResponse("general");
    }

    function playResponse(key: VideoKey): void {
        stop();
        setState("response");
        playVideoRef.current?.(key);
    }

    function onVideoEnd(): void {
        if (state === "greeting" || state === "response") {
            setState("listening");
            start();
            return;
        }

        if (state === "goodbye") {
            setState("idle");
            setTranscript("")
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
            <div className="bg-slate-900/70 backdrop-blur rounded-2xl shadow-2xl p-6 w-[560px] flex flex-col items-center gap-4 border border-slate-700">

                <h1 className="text-white text-xl font-semibold">
                    Virtual Anime Chat
                </h1>

                <VideoStage
                    state={state}
                    onVideoEnd={onVideoEnd}
                    onPlayRef={playVideoRef}
                />

                {state === "listening" && (
                    <div className="flex items-center gap-2 text-green-400">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        Listening...
                    </div>
                )}

                {transcript && (
                    <div className="text-sm text-slate-300 bg-slate-800 px-3 py-2 rounded w-full text-center">
                        You said: <span className="text-white">{transcript}</span>
                    </div>
                )}

                {state === "idle" && (
                    <button
                        onClick={() => setState("greeting")}
                        className="mt-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 transition text-white rounded-xl font-medium shadow-lg"
                    >
                        Start Chat
                    </button>
                )}
            </div>
        </div>
    );
}