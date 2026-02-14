export type ChatState =
    | "idle"
    | "greeting"
    | "listening"
    | "response"
    | "goodbye";

export type VideoKey =
    | "idle"
    | "greeting"
    | "listening"
    | "weather"
    | "general"
    | "goodbye"
    | "fallback"
    | "easter_egg";