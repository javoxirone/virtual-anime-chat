/// <reference types="dom-speech-recognition" />
import { useRef } from "react";


export function useSpeech(onResult: (text: string) => void): {
    start: () => void;
    stop: () => void;
} {
    const recognitionRef = useRef<InstanceType<typeof SpeechRecognition> | null>(null);


    const start = (): void => {
        const SpeechRecognitionCtor =
            (window as Window & typeof globalThis & {
                SpeechRecognition?: typeof SpeechRecognition;
                webkitSpeechRecognition?: typeof SpeechRecognition;
            }).SpeechRecognition ??
            (window as Window & typeof globalThis & {
                webkitSpeechRecognition?: typeof SpeechRecognition;
            }).webkitSpeechRecognition;

        if (!SpeechRecognitionCtor) {
            console.warn("Speech recognition not supported in this browser.");
            return;
        }


        recognitionRef.current?.abort();

        const recognition = new SpeechRecognitionCtor();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onresult = (e: SpeechRecognitionEvent): void => {
            const text = e.results[0][0].transcript.toLowerCase();
            onResult(text);
        };

        recognition.onerror = (): void => {
            onResult("__error__");
        };

        recognition.start();
        recognitionRef.current = recognition;
    };


    const stop = (): void => {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
    };

    return { start, stop };
}