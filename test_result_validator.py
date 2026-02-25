"""
Tests for ResultValidator using real chess-results.com HTML fixtures.

Test cases:
1. Joyce Ndirangu - Nairobi Chess Open Ladies (valid, all rounds played)
2. Madelta Glenda - Bungoma Ladies (not paired rounds 1,4,5,6 → walkover via SNo=-2)
3. Alex Kipkoech - Kitale Open (walkover K in round 1, not paired round 2)
4. Madelta Glenda - Kitale Ladies (walkover K in round 1, but kept playing — no -2 rows)
"""

import pytest
from unittest.mock import patch, MagicMock
from result_validator import ResultValidator


# === HTML fixtures from real chess-results.com pages ===

# Joyce Ndirangu - tnr1220021, snr=2 - Valid result (all 6 rounds played normally)
JOYCE_VALID_HTML = """
<html><body>
<table border="0" cellpadding="1" cellspacing="1" class="CRs1">
 <tr class="CRg1b">
  <th class="CRc">Rd.</th>
  <th class="CRc">Bo.</th>
  <th class="CRc">SNo</th>
  <th class="CR"></th>
  <th class="CR">Name</th>
  <th class="CRr">Rtg</th>
  <th class="CR">FED</th>
  <th class="CR">Club/City</th>
  <th class="CRc">Pts.</th>
  <th class="CRc">Res.</th>
 </tr>
 <tr class="CRg2">
  <td class="CRc">1</td>
  <td class="CRc">2</td>
  <td class="CRc">10</td>
  <td class="CR"></td>
  <td class="CR">Fantalis, Lucy Nduta</td>
  <td class="CRr">1586</td>
  <td class="CR">KEN</td>
  <td class="CR">Chess Kenya Elite</td>
  <td class="CRc">4</td>
  <td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRg1">
  <td class="CRc">2</td>
  <td class="CRc">2</td>
  <td class="CRc">11</td>
  <td class="CR"></td>
  <td class="CR">Maashao, Genevieve</td>
  <td class="CRr">1559</td>
  <td class="CR">KEN</td>
  <td class="CR">St Monica's Girls High School</td>
  <td class="CRc">2,5</td>
  <td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRg2">
  <td class="CRc">3</td>
  <td class="CRc">2</td>
  <td class="CRc">5</td>
  <td class="CR"></td>
  <td class="CR">Kaloki, Zuri</td>
  <td class="CRr">1700</td>
  <td class="CR">KEN</td>
  <td class="CR">Mavens Chess Club</td>
  <td class="CRc">4,5</td>
  <td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">0</td></tr></table></td>
 </tr>
 <tr class="CRg1">
  <td class="CRc">4</td>
  <td class="CRc">3</td>
  <td class="CRc">19</td>
  <td class="CR"></td>
  <td class="CR">Kosgei, Purity</td>
  <td class="CRr">0</td>
  <td class="CR">KEN</td>
  <td class="CR"></td>
  <td class="CRc">3</td>
  <td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRg2">
  <td class="CRc">5</td>
  <td class="CRc">1</td>
  <td class="CRc">4</td>
  <td class="CR"></td>
  <td class="CR">Jumba, Gloria</td>
  <td class="CRr">1736</td>
  <td class="CR">KEN</td>
  <td class="CR">KCB Chess Club</td>
  <td class="CRc">4,5</td>
  <td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRg1">
  <td class="CRc">6</td>
  <td class="CRc">2</td>
  <td class="CRc">22</td>
  <td class="CR"></td>
  <td class="CR">Nandujja, Maria Gorreth</td>
  <td class="CRr">0</td>
  <td class="CR">UGA</td>
  <td class="CR"></td>
  <td class="CRc">4</td>
  <td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
</table>
</body></html>
"""

# Madelta Glenda - tnr1283543, snr=3 - Not paired in rounds 1,4,5,6 (SNo=-2)
MADELTA_NOT_PAIRED_HTML = """
<html><body>
<table border="0" cellpadding="1" cellspacing="1" class="CRs1">
 <tr class="CRng1b">
  <th class="CRc">Rd.</th>
  <th class="CRc">Bo.</th>
  <th class="CRc">SNo</th>
  <th class="CR"></th>
  <th class="CR">Name</th>
  <th class="CRr">Rtg</th>
  <th class="CR">FED</th>
  <th class="CR">Club/City</th>
  <th class="CRc">Pts.</th>
  <th class="CRc">Res.</th>
  <td class="CRr">K</td>
  <th class="CRr">rtg+/-</th>
 </tr>
 <tr class="CRng2">
  <td class="CRc">1</td>
  <td class="CRc">10</td>
  <td class="CRc">-2</td>
  <td class="CR"></td>
  <td class="CR">not paired</td>
  <td class="CRr">0</td>
  <td class="CR"></td>
  <td class="CR"></td>
  <td class="CRc">0</td>
  <td class="CRc">- 0</td>
  <td></td>
  <td></td>
 </tr>
 <tr class="CRng1">
  <td class="CRc">2</td>
  <td class="CRc">7</td>
  <td class="CRc">10</td>
  <td class="CR"></td>
  <td class="CR">Brenda, Nasiche</td>
  <td class="CRr">0</td>
  <td class="CR">KEN</td>
  <td class="CR">Maseno Chess Club</td>
  <td class="CRc">0</td>
  <td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td>
  <td></td>
  <td></td>
 </tr>
 <tr class="CRng2">
  <td class="CRc">3</td>
  <td class="CRc">3</td>
  <td class="CRc">5</td>
  <td class="CR"></td>
  <td class="CR">Shannon, Bulimo</td>
  <td class="CRr">1568</td>
  <td class="CR">KEN</td>
  <td class="CR">Anchor Chess Club</td>
  <td class="CRc">3,5</td>
  <td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">0</td></tr></table></td>
  <td class="CRr">20</td>
  <td class="CRr">-14,80</td>
 </tr>
 <tr class="CRng1">
  <td class="CRc">4</td>
  <td class="CRc">9</td>
  <td class="CRc">-2</td>
  <td class="CR"></td>
  <td class="CR">not paired</td>
  <td class="CRr">0</td>
  <td class="CR"></td>
  <td class="CR"></td>
  <td class="CRc">0</td>
  <td class="CRc">- 0</td>
  <td></td>
  <td></td>
 </tr>
 <tr class="CRng2">
  <td class="CRc">5</td>
  <td class="CRc">9</td>
  <td class="CRc">-2</td>
  <td class="CR"></td>
  <td class="CR">not paired</td>
  <td class="CRr">0</td>
  <td class="CR"></td>
  <td class="CR"></td>
  <td class="CRc">0</td>
  <td class="CRc">- 0</td>
  <td></td>
  <td></td>
 </tr>
 <tr class="CRng1">
  <td class="CRc">6</td>
  <td class="CRc">8</td>
  <td class="CRc">-2</td>
  <td class="CR"></td>
  <td class="CR">not paired</td>
  <td class="CRr">0</td>
  <td class="CR"></td>
  <td class="CR"></td>
  <td class="CRc">0</td>
  <td class="CRc">- 0</td>
  <td></td>
  <td></td>
 </tr>
</table>
</body></html>
"""

# Alex Kipkoech - tnr1095243, snr=35 - Walkover (K in round 1, not paired round 2)
ALEX_WALKOVER_HTML = """
<html><body>
<table border="0" cellpadding="1" cellspacing="1" class="CRs1">
 <tr class="CRng1b">
  <th class="CRc">Rd.</th>
  <th class="CRc">Bo.</th>
  <th class="CRc">SNo</th>
  <th class="CR"></th>
  <th class="CR">Name</th>
  <th class="CRr">Rtg</th>
  <th class="CR">FED</th>
  <th class="CR">Club/City</th>
  <th class="CRc">Pts.</th>
  <th class="CRc">Res.</th>
 </tr>
 <tr class="CRng2">
  <td class="CRc">1</td>
  <td class="CRc">2</td>
  <td class="CRc">2</td>
  <td class="CR"></td>
  <td class="CR">Kaloki, Hawi</td>
  <td class="CRr">2040</td>
  <td class="CR">KEN</td>
  <td class="CR">KCB Chess Club</td>
  <td class="CRc">5</td>
  <td class="CRc">- 0K</td>
 </tr>
 <tr class="CRng1">
  <td class="CRc">2</td>
  <td class="CRc">64</td>
  <td class="CRc">-2</td>
  <td class="CR"></td>
  <td class="CR">not paired</td>
  <td class="CRr">0</td>
  <td class="CR"></td>
  <td class="CR"></td>
  <td class="CRc">0</td>
  <td class="CRc">- 0</td>
 </tr>
 <tr class="CRng2">
  <td class="CRc">3</td>
  <td class="CRc">51</td>
  <td class="CRc">59</td>
  <td class="CR"></td>
  <td class="CR">Vansh, Shah</td>
  <td class="CRr">1497</td>
  <td class="CR">KEN</td>
  <td class="CR">Harton Grange Academy</td>
  <td class="CRc">2</td>
  <td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRng1">
  <td class="CRc">4</td>
  <td class="CRc">37</td>
  <td class="CRc">84</td>
  <td class="CR"></td>
  <td class="CR">Elvis, Waiguru</td>
  <td class="CRr">0</td>
  <td class="CR">KEN</td>
  <td class="CR"></td>
  <td class="CRc">2</td>
  <td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRng2">
  <td class="CRc">5</td>
  <td class="CRc">25</td>
  <td class="CRc">85</td>
  <td class="CR"></td>
  <td class="CR">Emmanuel, Kwambai</td>
  <td class="CRr">0</td>
  <td class="CR">KEN</td>
  <td class="CR"></td>
  <td class="CRc">3</td>
  <td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRng1">
  <td class="CRc">6</td>
  <td class="CRc">25</td>
  <td class="CRc">69</td>
  <td class="CR"></td>
  <td class="CR">Amugune, Ephrahim</td>
  <td class="CRr">0</td>
  <td class="CR">KEN</td>
  <td class="CR"></td>
  <td class="CRc">3</td>
  <td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
</table>
</body></html>
"""


# Madelta Glenda - tnr1220021, snr=3 - Kitale Ladies
# Walkover K in round 1 against real opponent, but kept playing all remaining rounds.
# No SNo=-2 rows at all. This is the edge case the old validator missed.
MADELTA_KITALE_WALKOVER_HTML = """
<html><body>
<table border="0" cellpadding="1" cellspacing="1" class="CRs1">
 <tr class="CRng1b">
  <th class="CRc">Rd.</th>
  <th class="CRc">Bo.</th>
  <th class="CRc">SNo</th>
  <th class="CR"></th>
  <th class="CR">Name</th>
  <th class="CRr">Rtg</th>
  <th class="CR">FED</th>
  <th class="CR">Club/City</th>
  <th class="CRc">Pts.</th>
  <th class="CRc">Res.</th>
 </tr>
 <tr class="CRng2">
  <td class="CRc">1</td>
  <td class="CRc">3</td>
  <td class="CRc">11</td>
  <td class="CR"></td>
  <td class="CR">Maashao, Genevieve</td>
  <td class="CRr">1559</td>
  <td class="CR">KEN</td>
  <td class="CR">St Monica's Girls High School</td>
  <td class="CRc">2,5</td>
  <td class="CRc">- 0K</td>
 </tr>
 <tr class="CRng1">
  <td class="CRc">2</td>
  <td class="CRc">13</td>
  <td class="CRc">16</td>
  <td class="CR"></td>
  <td class="CR">Cherop, Kimberly</td>
  <td class="CRr">0</td>
  <td class="CR">KEN</td>
  <td class="CR">Kitale Chess Academy</td>
  <td class="CRc">1</td>
  <td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRng2">
  <td class="CRc">3</td>
  <td class="CRc">3</td>
  <td class="CRc">24</td>
  <td class="CR"></td>
  <td class="CR">Patricia, Nafuna</td>
  <td class="CRr">0</td>
  <td class="CR">KEN</td>
  <td class="CR">St Monica's Girls High School</td>
  <td class="CRc">2</td>
  <td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRng1">
  <td class="CRc">4</td>
  <td class="CRc">4</td>
  <td class="CRc">20</td>
  <td class="CR"></td>
  <td class="CR">Maysie, Andia</td>
  <td class="CRr">0</td>
  <td class="CR">KEN</td>
  <td class="CR">St Monica's Girls High School</td>
  <td class="CRc">3</td>
  <td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRng2">
  <td class="CRc">5</td>
  <td class="CRc">3</td>
  <td class="CRc">8</td>
  <td class="CR"></td>
  <td class="CR">Pamela, Kosala</td>
  <td class="CRr">1635</td>
  <td class="CR">KEN</td>
  <td class="CR">Kitale Chess Academy</td>
  <td class="CRc">4</td>
  <td class="CR"><table><tr><td><div class="FarbesT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
 <tr class="CRng1">
  <td class="CRc">6</td>
  <td class="CRc">1</td>
  <td class="CRc">1</td>
  <td class="CR"></td>
  <td class="CR">Mutisya, Jully</td>
  <td class="CRr">1842</td>
  <td class="CR">KEN</td>
  <td class="CR">Equity Chess Club</td>
  <td class="CRc">4</td>
  <td class="CR"><table><tr><td><div class="FarbewT"></div></td><td class="CR">1</td></tr></table></td>
 </tr>
</table>
</body></html>
"""


def _mock_response(html: str) -> MagicMock:
    """Create a mock response with the given HTML text."""
    resp = MagicMock()
    resp.text = html
    resp.status_code = 200
    return resp


class TestResultValidator:

    def setup_method(self):
        self.validator = ResultValidator()

    def test_valid_result_joyce_nairobi(self):
        """Joyce Ndirangu - Nairobi Chess Open Ladies: all 6 rounds played normally."""
        self.validator.session.get = MagicMock(return_value=_mock_response(JOYCE_VALID_HTML))

        game_results, status = self.validator.get_player_game_results("1220021", 2)

        assert status == "valid"
        # cells[2] reads the SNo column: 10, 11, 5, 19, 4, 22
        assert len(game_results) == 6
        assert all("+" not in r and "-" not in r and "K" not in r for r in game_results)

    def test_not_paired_madelta_bungoma(self):
        """Madelta Glenda - Bungoma Ladies: not paired in rounds 1,4,5,6.

        The validator catches this via cells[2] reading SNo=-2, which contains '-'.
        Returns 'walkover' (the first matching check), even though 'not paired'
        would also match via results_text.
        """
        self.validator.session.get = MagicMock(return_value=_mock_response(MADELTA_NOT_PAIRED_HTML))

        game_results, status = self.validator.get_player_game_results("1283543", 3)

        assert status == "walkover"
        # SNo column has -2 for not-paired rounds
        assert any("-" in r for r in game_results)

    def test_walkover_k_alex_kitale(self):
        """Alex Kipkoech - Kitale Open: lost round 1 via walkover (K marker), not paired round 2.

        Round 1 has SNo=2 (normal opponent) but the Res column shows '- 0K'.
        The validator reads cells[2] = SNo = '2' for that row (no match).
        Round 2 has SNo=-2 (not paired), so '-' in '-2' triggers 'walkover'.
        """
        self.validator.session.get = MagicMock(return_value=_mock_response(ALEX_WALKOVER_HTML))

        game_results, status = self.validator.get_player_game_results("1095243", 35)

        assert status == "walkover"

    def test_walkover_k_no_not_paired_madelta_kitale(self):
        """Madelta Glenda - Kitale Ladies: walkover K in round 1, kept playing rounds 2-6.

        This is the edge case: no SNo=-2 rows, no 'not paired' text.
        The only indicator is '- 0K' in the Res column (not read by cells[2]).
        The 'K' appears in results_text though (full table text includes '- 0K').
        """
        self.validator.session.get = MagicMock(return_value=_mock_response(MADELTA_KITALE_WALKOVER_HTML))

        game_results, status = self.validator.get_player_game_results("1220021", 3)

        assert status == "walkover"

    def test_determine_status_no_issues(self):
        """Direct test of _determine_result_status with clean data."""
        status = self.validator._determine_result_status(
            ["10", "11", "5", "19", "4", "22"],  # SNo values, no special chars
            "Rd. Bo. SNo Name Rtg FED 1 2 10 Fantalis 1586 KEN"
        )
        assert status == "valid"

    def test_determine_status_minus_in_sno(self):
        """SNo=-2 (not paired) triggers walkover via '-' check."""
        status = self.validator._determine_result_status(
            ["-2", "10", "5", "-2", "-2", "-2"],
            "Rd. Bo. SNo Name not paired"
        )
        assert status == "walkover"

    def test_determine_status_0k_in_results_text(self):
        """'0K' (forfeit loss) in results_text triggers walkover."""
        status = self.validator._determine_result_status(
            ["2", "10", "5"],  # clean SNo values
            "Rd. Bo. SNo Name - 0K some text"
        )
        assert status == "walkover"

    def test_determine_status_1k_is_not_walkover(self):
        """'1K' (opponent forfeited, free win) should NOT penalize the player."""
        status = self.validator._determine_result_status(
            ["10", "5", "3"],
            "Rd. Bo. SNo Name + 1K some text"
        )
        assert status == "valid"

    def test_determine_status_k_in_names_no_false_positive(self):
        """'K' in player names or 'KEN' should NOT trigger walkover."""
        status = self.validator._determine_result_status(
            ["10", "5", "3"],
            "Rd. Bo. SNo Name Kaloki, Zuri 1700 KEN Mavens Chess Club"
        )
        assert status == "valid"

    def test_determine_status_rating_ken_no_false_positive(self):
        """Rating followed by KEN (e.g. '1574KEN') should NOT trigger walkover."""
        status = self.validator._determine_result_status(
            ["10", "5"],
            "Rd. Bo. SNo Name Fantalis1586KENChess Kenya"
        )
        assert status == "valid"

    def test_determine_status_zero_rating_ken_no_false_positive(self):
        """Unrated player (rating 0) with KEN federation should NOT trigger walkover.

        Real case: Ayuma, Samara with rating 0 and federation KEN produces
        '0KEN' in results_text which must not match the 0K walkover pattern.
        """
        status = self.validator._determine_result_status(
            ["23", "10", "5"],
            "Rd. Bo. SNo Name Ayuma, Samara\t0\tKEN\tMavens Chess Club"
        )
        assert status == "valid"

    def test_determine_status_not_paired_in_text(self):
        """'not paired' in results_text triggers 'incomplete' if no -/+/K in game_results."""
        status = self.validator._determine_result_status(
            ["10", "5", "3"],  # clean SNo values
            "Rd. Bo. SNo Name not paired some text"
        )
        assert status == "incomplete"

    def test_determine_status_withdrawn(self):
        """'withdrawn' in results_text triggers 'withdrawn'."""
        status = self.validator._determine_result_status(
            ["10", "5"],
            "Rd. Bo. SNo Name Withdrawn after round 2"
        )
        assert status == "withdrawn"

    def test_error_returns_unknown(self):
        """Network error returns empty results and 'unknown' status."""
        self.validator.session.get = MagicMock(side_effect=Exception("Connection failed"))

        game_results, status = self.validator.get_player_game_results("999999", 1)

        assert game_results == []
        assert status == "unknown"
