from music21 import key, stream


def _format_key_name(key_obj: key.Key) -> str:
    """Turn music21's key name (e.g. 'B-') into a friendlier one (e.g. 'B♭')."""
    return str(key_obj).replace("-", "♭").replace("#", "♯")


def detect_key_signature(score: stream.Score) -> dict[str, object]:
    """Detect the key by counting the sharps/flats in the score's key signature.

    A key signature alone can't distinguish a major key from its relative
    minor (e.g. 2 sharps could be D major OR B minor) - telling them apart
    needs the actual notes, not just the signature. So this reports both
    possibilities honestly instead of guessing one.
    """
    key_signatures = list(score.recurse().getElementsByClass(key.KeySignature))
    sharps = key_signatures[0].sharps if key_signatures else 0
    signature = key.KeySignature(sharps)

    return {
        "sharps": sharps,
        "major_key": _format_key_name(signature.asKey("major")),
        "minor_key": _format_key_name(signature.asKey("minor")),
    }
