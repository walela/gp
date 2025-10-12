import re
from typing import Optional


def infer_location(name: Optional[str]) -> Optional[str]:
    """Best-effort inference of tournament location from its name."""
    if not name:
        return None

    normalized = name.strip().upper()

    location_map = [
        ("ELDORET", "Eldoret"),
        ("KISUMU", "Kisumu"),
        ("WARIDI", "Nairobi"),
        ("MAVENS", "Nairobi"),
        ("NAKURU", "Nakuru"),
        ("QUO VADIS", "Nyeri"),
        ("KIAMBU", "Kiambu"),
        ("KITALE", "Kitale"),
        ("MOMBASA", "Mombasa"),
        ("BUNGOMA", "Bungoma"),
    ]

    for keyword, location in location_map:
        if keyword in normalized:
            return location

    # Try to capture trailing location like "Open - City"
    match = re.search(r"OPEN\s+(?:CHESS\s+)?(?:CHAMPIONSHIP\s+)?([A-Z\s]+)$", normalized)
    if match:
        guess = match.group(1).title().strip()
        if guess:
            return guess

    return "Nairobi"


def infer_rounds(name: Optional[str], default: int = 6) -> int:
    """Heuristic rounding for tournaments without explicit round metadata."""
    if not name:
        return default

    normalized = name.upper()
    eight_round_keywords = [
        "MAVENS",
        "NAIROBI COUNTY",
        "QUO VADIS",
        "KENYA OPEN",
        "GRAND CHESS TOURNAMENT",
    ]

    if any(keyword in normalized for keyword in eight_round_keywords):
        return 8

    return default
