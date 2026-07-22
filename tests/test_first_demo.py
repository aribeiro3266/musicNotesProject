import unittest
from pathlib import Path

from music_project.first_demo import load_bach_example, write_midi_file


class FirstDemoTests(unittest.TestCase):
    def test_load_bach_example_returns_score_with_parts(self) -> None:
        score = load_bach_example()
        self.assertTrue(score.parts)
        self.assertEqual(len(score.parts), 4)

    def test_write_midi_file_creates_output(self) -> None:
        score = load_bach_example()
        out_path = Path("test_output.mid")
        if out_path.exists():
            out_path.unlink()

        write_midi_file(score, out_path)

        self.assertTrue(out_path.exists())
        out_path.unlink()


if __name__ == "__main__":
    unittest.main()
