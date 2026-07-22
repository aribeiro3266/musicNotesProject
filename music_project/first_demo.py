from __future__ import annotations

from pathlib import Path

from music21 import converter, corpus, key, meter, metadata, note, stream


def _build_learning_score() -> stream.Score:
    """Create a small four-part example that works without downloading corpus data."""
    score = stream.Score()
    score.metadata = metadata.Metadata()
    score.metadata.title = "Learning Example"
    score.metadata.composer = "musicNotes"

    part_specs = [
        ("Soprano", ["C4", "E4", "G4", "A4", "G4", "E4"]),
        ("Alto", ["G3", "C4", "E4", "F4", "E4", "C4"]),
        ("Tenor", ["E3", "G3", "C4", "D4", "C4", "G3"]),
        ("Bass", ["C3", "C3", "C3", "F2", "C3", "C3"]),
    ]

    for name, pitches in part_specs:
        part = stream.Part(id=name.lower())
        part.partName = name
        part.append(meter.TimeSignature("4/4"))
        part.append(key.Key("C"))
        for pitch_name in pitches:
            new_note = note.Note(pitch_name, quarterLength=1.0)
            part.append(new_note)
        score.append(part)

    return score


def load_bach_example() -> stream.Score:
    """Load a Bach chorale when available, otherwise fall back to a built-in example."""
    try:
        return corpus.parse("bach/bwv66.6")
    except Exception:
        return _build_learning_score()


def load_score_from_file(path: str | Path) -> stream.Score:
    """Load a score from an arbitrary file (e.g. MusicXML produced by OMR)."""
    return converter.parse(str(path))


def select_parts(score: stream.Score, part_names: list[str]) -> stream.Score:
    """Return a new score containing only the parts whose name is in part_names."""
    selected = stream.Score()
    selected.metadata = score.metadata
    for part in score.parts:
        if part.partName in part_names:
            selected.append(part)
    return selected


def write_midi_file(score: stream.Score, output_path: str | Path) -> Path:
    """Write the full score to a MIDI file."""
    out_path = Path(output_path)
    score.write("midi", fp=str(out_path))
    return out_path


def summarize_parts(score: stream.Score) -> list[dict[str, object]]:
    """Return each part's name and note count as plain data (no printing)."""
    summary = []
    for part in score.parts:
        note_count = sum(1 for _ in part.recurse().notes)
        summary.append({"name": part.partName or "unnamed", "note_count": note_count})
    return summary


def print_part_summary(score: stream.Score) -> None:
    """Print each part name and its note count for learning purposes."""
    for index, part_info in enumerate(summarize_parts(score)):
        print(f"Part {index + 1}: {part_info['name']} -> {part_info['note_count']} notes")


if __name__ == "__main__":
    score = load_bach_example()
    print_part_summary(score)
    output = write_midi_file(score, "demo_output.mid")
    print(f"Wrote MIDI file to {output}")
