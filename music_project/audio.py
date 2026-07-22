import subprocess
from pathlib import Path

SOUNDFONT_PATH = Path("assets/FluidR3_GM_GS.sf2")


def render_to_wav(
    midi_path: str | Path,
    wav_path: str | Path,
    soundfont_path: str | Path = SOUNDFONT_PATH,
) -> Path:
    """Render a MIDI file to a WAV file by calling the fluidsynth command-line tool.

    fluidsynth requires options before file arguments (options] [soundfonts] [midifiles]),
    so this builds the command directly instead of using the midi2audio wrapper, whose
    option-after-files ordering fails on current fluidsynth versions.
    """
    out_path = Path(wav_path)
    subprocess.run(
        [
            "fluidsynth",
            "-ni",
            "-F", str(out_path),
            "-r", "44100",
            str(soundfont_path),
            str(midi_path),
        ],
        check=True,
    )
    return out_path
