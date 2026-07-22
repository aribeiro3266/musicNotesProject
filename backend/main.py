import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from music_project.audio import render_to_wav
from music_project.first_demo import (
    load_bach_example,
    load_score_from_file,
    select_parts,
    summarize_parts,
    write_midi_file,
)
from music_project.omr import scan_image_to_musicxml

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

UPLOADS_DIR = Path("uploads")


def _piece_mxl_path(piece_id: str) -> Path:
    omr_dir = UPLOADS_DIR / piece_id / "omr"
    mxl_files = list(omr_dir.glob("*.mxl")) if omr_dir.exists() else []
    if not mxl_files:
        raise HTTPException(status_code=404, detail=f"No piece found for id {piece_id}")
    return mxl_files[0]


@app.get("/api/parts")
def get_parts() -> list[dict[str, object]]:
    score = load_bach_example()
    return summarize_parts(score)


@app.get("/api/midi")
def get_midi(parts: str | None = None) -> FileResponse:
    score = load_bach_example()
    if parts:
        score = select_parts(score, parts.split(","))
    suffix = parts.replace(",", "_") if parts else "all"
    midi_path = Path(f"demo_output_{suffix}.mid")
    write_midi_file(score, midi_path)
    return FileResponse(
        midi_path,
        media_type="audio/midi",
        filename=f"bach_chorale_{suffix}.mid",
    )


@app.get("/api/audio")
def get_audio(parts: str | None = None) -> FileResponse:
    score = load_bach_example()
    if parts:
        score = select_parts(score, parts.split(","))
    suffix = parts.replace(",", "_") if parts else "all"
    midi_path = Path(f"demo_output_{suffix}.mid")
    wav_path = Path(f"demo_output_{suffix}.wav")
    write_midi_file(score, midi_path)
    render_to_wav(midi_path, wav_path)
    return FileResponse(
        wav_path,
        media_type="audio/wav",
        filename=f"bach_chorale_{suffix}.wav",
    )


@app.post("/api/pieces")
def upload_piece(file: UploadFile) -> dict[str, object]:
    piece_id = uuid.uuid4().hex
    piece_dir = UPLOADS_DIR / piece_id
    piece_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "upload.jpg").suffix or ".jpg"
    image_path = piece_dir / f"original{extension}"
    image_path.write_bytes(file.file.read())

    try:
        mxl_path = scan_image_to_musicxml(image_path, piece_dir / "omr")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not read this scan: {exc}") from exc

    score = load_score_from_file(mxl_path)
    return {"piece_id": piece_id, "parts": summarize_parts(score)}


@app.get("/api/pieces/{piece_id}/midi")
def get_piece_midi(piece_id: str) -> FileResponse:
    mxl_path = _piece_mxl_path(piece_id)
    score = load_score_from_file(mxl_path)
    midi_path = UPLOADS_DIR / piece_id / "score.mid"
    write_midi_file(score, midi_path)
    return FileResponse(midi_path, media_type="audio/midi", filename=f"{piece_id}.mid")


@app.get("/api/pieces/{piece_id}/audio")
def get_piece_audio(piece_id: str) -> FileResponse:
    mxl_path = _piece_mxl_path(piece_id)
    score = load_score_from_file(mxl_path)
    midi_path = UPLOADS_DIR / piece_id / "score.mid"
    wav_path = UPLOADS_DIR / piece_id / "score.wav"
    write_midi_file(score, midi_path)
    render_to_wav(midi_path, wav_path)
    return FileResponse(wav_path, media_type="audio/wav", filename=f"{piece_id}.wav")
