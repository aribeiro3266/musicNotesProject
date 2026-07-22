"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type PartSummary = {
  name: string;
  note_count: number;
};

export default function Home() {
  const [parts, setParts] = useState<PartSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<"all" | "Tenor" | "Bass">("all");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [pieceParts, setPieceParts] = useState<PartSummary[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/parts`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }
        return response.json();
      })
      .then(setParts)
      .catch((err) => setError(err.message));
  }, []);

  const handleUpload = () => {
    if (!uploadFile) return;

    setUploading(true);
    setUploadError(null);
    setPieceId(null);

    const formData = new FormData();
    formData.append("file", uploadFile);

    fetch(`${API_URL}/api/pieces`, { method: "POST", body: formData })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }
        return response.json();
      })
      .then((data: { piece_id: string; parts: PartSummary[] }) => {
        setPieceId(data.piece_id);
        setPieceParts(data.parts);
      })
      .catch((err) => setUploadError(err.message))
      .finally(() => setUploading(false));
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Bach Chorale (BWV 66.6)</h1>
      <p className="mt-2 text-zinc-600">
        Loaded via music21 from the backend at {API_URL}.
      </p>

      {error && <p className="mt-6 text-red-600">Could not reach backend: {error}</p>}

      {!error && parts.length === 0 && (
        <p className="mt-6 text-zinc-500">Loading parts...</p>
      )}

      {parts.length > 0 && (
        <table className="mt-6 w-full border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th className="py-2">Part</th>
              <th className="py-2">Note count</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.name} className="border-b">
                <td className="py-2">{part.name}</td>
                <td className="py-2">{part.note_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-8 flex gap-2">
        {(["all", "Tenor", "Bass"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setPlayMode(mode)}
            className={`rounded px-4 py-2 ${
              playMode === mode ? "bg-black text-white" : "bg-zinc-200 text-black"
            }`}
          >
            {mode === "all" ? "Play All" : `Play ${mode} Only`}
          </button>
        ))}
      </div>

      <audio
        controls
        className="mt-4 w-full"
        src={
          playMode === "all"
            ? `${API_URL}/api/audio`
            : `${API_URL}/api/audio?parts=${playMode}`
        }
      >
        Your browser does not support the audio element.
      </audio>

      <a
        href={
          playMode === "all"
            ? `${API_URL}/api/midi`
            : `${API_URL}/api/midi?parts=${playMode}`
        }
        className="mt-4 inline-block rounded bg-black px-4 py-2 text-white"
      >
        Download MIDI
      </a>

      <hr className="mt-12 mb-8" />

      <h2 className="text-2xl font-semibold">Upload your own sheet music</h2>
      <p className="mt-2 text-zinc-600">
        Upload a photo or scan (JPG/PNG). This uses OMR (optical music
        recognition) to read the notes, so accuracy depends on scan quality
        &mdash; it&apos;s experimental, not guaranteed to be perfect.
      </p>

      <input
        type="file"
        accept="image/jpeg,image/png"
        onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
        className="mt-4 block"
      />
      <button
        onClick={handleUpload}
        disabled={!uploadFile || uploading}
        className="mt-4 rounded bg-black px-4 py-2 text-white disabled:opacity-40"
      >
        {uploading ? "Reading sheet music... (can take a minute)" : "Upload"}
      </button>

      {uploadError && (
        <p className="mt-4 text-red-600">Could not read this scan: {uploadError}</p>
      )}

      {pieceId && (
        <>
          <table className="mt-6 w-full border-collapse text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Part</th>
                <th className="py-2">Note count</th>
              </tr>
            </thead>
            <tbody>
              {pieceParts.map((part, index) => (
                <tr key={`${part.name}-${index}`} className="border-b">
                  <td className="py-2">{part.name}</td>
                  <td className="py-2">{part.note_count}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <audio
            controls
            className="mt-6 w-full"
            src={`${API_URL}/api/pieces/${pieceId}/audio`}
          >
            Your browser does not support the audio element.
          </audio>

          <a
            href={`${API_URL}/api/pieces/${pieceId}/midi`}
            className="mt-4 inline-block rounded bg-black px-4 py-2 text-white"
          >
            Download MIDI
          </a>
        </>
      )}
    </main>
  );
}
