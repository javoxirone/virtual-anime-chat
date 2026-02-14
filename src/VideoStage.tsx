import { useCallback, useEffect, useRef } from "react";
import type { ChatState, VideoKey } from "./types";

type Props = {
    state: ChatState;
    onVideoEnd: () => void;

    onPlayRef: React.MutableRefObject<((key: VideoKey) => void) | null>;
};

const LOOPING_KEYS = new Set<VideoKey>(["idle", "listening"]);

const STATE_VIDEO_MAP: Partial<Record<ChatState, VideoKey>> = {
    idle: "idle",
    greeting: "greeting",
    listening: "listening",
    goodbye: "goodbye",
};


export default function VideoStage({ state, onVideoEnd, onPlayRef }: Props) {
    const refs: Record<VideoKey, React.RefObject<HTMLVideoElement | null>> = {
        idle: useRef<HTMLVideoElement>(null),
        greeting: useRef<HTMLVideoElement>(null),
        listening: useRef<HTMLVideoElement>(null),
        weather: useRef<HTMLVideoElement>(null),
        general: useRef<HTMLVideoElement>(null),
        goodbye: useRef<HTMLVideoElement>(null),
        fallback: useRef<HTMLVideoElement>(null),
        easter_egg: useRef<HTMLVideoElement>(null),
    };

    const allRefs = Object.values(refs) as React.RefObject<HTMLVideoElement | null>[];

    const play = useCallback((key: VideoKey): void => {
        allRefs.forEach((ref) => {
            if (ref.current) {
                ref.current.pause();
                ref.current.currentTime = 0;
                ref.current.style.opacity = "0";
            }
        });

        const target = refs[key].current;
        if (target) {
            target.style.opacity = "1";
            target.play().catch(() => {
            });
        }
    }, []);

    useEffect(() => {
        onPlayRef.current = play;
    }, [play, onPlayRef]);

    useEffect(() => {
        const key = STATE_VIDEO_MAP[state];
        if (key) play(key);
    }, [state, play]);

    return (
        <div className="relative w-[480px] h-[270px] bg-black rounded-xl overflow-hidden">
            {(Object.entries(refs) as [VideoKey, React.RefObject<HTMLVideoElement>][]).map(
                ([key, ref]) => (
                    <video
                        key={key}
                        ref={ref}
                        src={`/videos/${key}.mp4`}
                        preload="auto"
                        loop={LOOPING_KEYS.has(key)}
                        onEnded={LOOPING_KEYS.has(key) ? undefined : onVideoEnd}
                        className="absolute top-0 left-0 w-full h-full object-cover opacity-0 transition-opacity duration-200"
                    />
                )
            )}
        </div>
    );
}