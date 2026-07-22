"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type PartSummary = {
  name: string;
  note_count: number;
};

type KeyInfo = {
  sharps: number;
  major_key: string;
  minor_key: string;
};

type InstrumentMode = "default" | "piano" | "choir";

const INSTRUMENT_LABELS: Record<InstrumentMode, string> = {
  default: "Default",
  piano: "Piano",
  choir: "Choir (ooh/aah)",
};

function buildQuery(params: Record<string, string>): string {
  const entries = Object.entries(params).filter(([, value]) => value);
  return entries.length === 0 ? "" : `?${new URLSearchParams(entries).toString()}`;
}

function InstrumentSelector({
  mode,
  onChange,
}: {
  mode: InstrumentMode;
  onChange: (mode: InstrumentMode) => void;
}) {
  return (
    <div className="mt-2 flex gap-2">
      {(Object.keys(INSTRUMENT_LABELS) as InstrumentMode[]).map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`rounded px-3 py-1 text-sm ${
            mode === option ? "bg-zinc-700 text-white" : "bg-zinc-100 text-black"
          }`}
        >
          {INSTRUMENT_LABELS[option]}
        </button>
      ))}
    </div>
  );
}

function KeyPanel({ label, info }: { label: string; info: KeyInfo | null }) {
  if (!info) return null;

  const signatureLabel =
    info.sharps === 0
      ? "no sharps or flats"
      : info.sharps > 0
        ? `${info.sharps} sharp${info.sharps > 1 ? "s" : ""}`
        : `${-info.sharps} flat${-info.sharps > 1 ? "s" : ""}`;

  return (
    <div className="rounded border border-zinc-300 p-4">
      <p className="text-sm font-semibold text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{info.major_key}</p>
      <p className="text-sm text-zinc-500">or {info.minor_key}</p>
      <p className="mt-2 text-xs text-zinc-400">
        Key signature has {signatureLabel}. A signature alone can&apos;t tell
        major from relative minor &mdash; that needs the actual notes.
      </p>
    </div>
  );
}

export default function Home() {
  const [parts, setParts] = useState<PartSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [playMode, setPlayMode] = useState<"all" | "Tenor" | "Bass">("all");
  const [bachKey, setBachKey] = useState<KeyInfo | null>(null);
  const [instrumentMode, setInstrumentMode] = useState<InstrumentMode>("default");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pieceId, setPieceId] = useState<string | null>(null);
  const [pieceParts, setPieceParts] = useState<PartSummary[]>([]);
  const [pieceKey, setPieceKey] = useState<KeyInfo | null>(null);
  const [piecePlayMode, setPiecePlayMode] = useState<string>("all");
  const [pieceInstrumentMode, setPieceInstrumentMode] = useState<InstrumentMode>("default");

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

    fetch(`${API_URL}/api/key`)
      .then((response) => response.json())
      .then(setBachKey)
      .catch(() => {});
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
      .then((data: { piece_id: string; parts: PartSummary[]; key: KeyInfo }) => {
        setPieceId(data.piece_id);
        setPieceParts(data.parts);
        setPieceKey(data.key);
        setPiecePlayMode("all");
        setPieceInstrumentMode("default");
      })
      .catch((err) => setUploadError(err.message))
      .finally(() => setUploading(false));
  };

  return (
    <div className="mx-auto flex max-w-3xl gap-8 px-6 py-16">
      <aside className="w-56 shrink-0 space-y-4">
        <KeyPanel label="Bach Chorale key" info={bachKey} />
        <KeyPanel label="Uploaded piece key" info={pieceKey} />
      </aside>

      <main className="min-w-0 flex-1">
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

      <InstrumentSelector mode={instrumentMode} onChange={setInstrumentMode} />

      <audio
        controls
        className="mt-4 w-full"
        src={`${API_URL}/api/audio${buildQuery({
          parts: playMode === "all" ? "" : playMode,
          instrument: instrumentMode === "default" ? "" : instrumentMode,
        })}`}
      >
        Your browser does not support the audio element.
      </audio>

      <a
        href={`${API_URL}/api/midi${buildQuery({
          parts: playMode === "all" ? "" : playMode,
          instrument: instrumentMode === "default" ? "" : instrumentMode,
        })}`}
        className="mt-4 inline-block rounded bg-black px-4 py-2 text-white"
      >
        Download MIDI
      </a>

      <hr className="mt-12 mb-8" />

      <h2 className="text-2xl font-semibold">Upload your own sheet music</h2>
      <p className="mt-2 text-zinc-600">
        Upload a photo, scan, or PDF (JPG/PNG/PDF). This uses OMR (optical
        music recognition) to read the notes, so accuracy depends on scan
        quality &mdash; it&apos;s experimental, not guaranteed to be perfect.
        Only the first page is read for now &mdash; multi-page pieces
        aren&apos;t supported yet.
      </p>

      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
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

          <div className="mt-6 flex flex-wrap gap-2">
            {["all", ...Array.from(new Set(pieceParts.map((p) => p.name)))].map(
              (mode) => (
                <button
                  key={mode}
                  onClick={() => setPiecePlayMode(mode)}
                  className={`rounded px-4 py-2 ${
                    piecePlayMode === mode
                      ? "bg-black text-white"
                      : "bg-zinc-200 text-black"
                  }`}
                >
                  {mode === "all" ? "Play All" : `Play ${mode} Only`}
                </button>
              ),
            )}
          </div>

          <InstrumentSelector mode={pieceInstrumentMode} onChange={setPieceInstrumentMode} />

          <audio
            controls
            className="mt-4 w-full"
            src={`${API_URL}/api/pieces/${pieceId}/audio${buildQuery({
              parts: piecePlayMode === "all" ? "" : piecePlayMode,
              instrument: pieceInstrumentMode === "default" ? "" : pieceInstrumentMode,
            })}`}
          >
            Your browser does not support the audio element.
          </audio>

          <a
            href={`${API_URL}/api/pieces/${pieceId}/midi${buildQuery({
              parts: piecePlayMode === "all" ? "" : piecePlayMode,
              instrument: pieceInstrumentMode === "default" ? "" : pieceInstrumentMode,
            })}`}
            className="mt-4 inline-block rounded bg-black px-4 py-2 text-white"
          >
            Download MIDI
          </a>
        </>
      )}
      </main>
    </div>
  );
}
