"use client";

import dynamic from "next/dynamic";

// Leaflet touches `window` when it loads, so the maps only render in the browser.
const placeholder = () => <div className="h-full w-full animate-pulse bg-stone-200" />;

export const JamMap = dynamic(() => import("./JamMap"), { ssr: false, loading: placeholder });
export const LocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false, loading: placeholder });
