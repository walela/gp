"""Grand Prix player eligibility rules."""

import re
from typing import Optional


# Chess-Results federation can reflect registration rather than GP eligibility.
# These players are known non-citizens and should not count in GP rankings even
# when a source tournament lists them under Kenya.
INELIGIBLE_GP_PLAYER_FIDE_IDS = {
    "10891420",  # Atem Gak, Ngong
    "2004348",   # Gilruth Peter
    "10830987",  # Chvoro Viacheslav
    "10848525",  # Bhavsar Nisha Nileshbhai
    "10829326",  # Chitundu Limbikani
    "10891536",  # Deng Achuoth Atem
    "10891544",  # Nyok Ayual Jock
    "554010039",  # Deng Abuoi Chol
    "10895345",  # Kuir Maleek Kuir
    "10891463",  # Pager Thuch Alaak Daniel
}

INELIGIBLE_GP_PLAYER_NAMES = {
    "atem gak ngong",
    "ngong atem gak",
    "gilruth peter",
    "peter gilruth",
    "chvoro viacheslav",
    "viacheslav chvoro",
    "bhavsar nisha nileshbhai",
    "nisha nileshbhai bhavsar",
    "nisha bhavsar",
    "chitundu limbikani",
    "limbikani chitundu",
    "deng achuoth atem",
    "atem deng achuoth",
    "nyok ayual jock",
    "jock nyok ayual",
    "deng abuoi chol",
    "chol deng abuoi",
    "kuir maleek kuir",
    "maleek kuir kuir",
    "michael atem biar",
    "atem biar michael",
    "pager thuch alaak daniel",
    "alaak daniel pager thuch",
}


def _normalize_name(name: Optional[str]) -> str:
    if not name:
        return ""
    return re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()


def is_gp_eligible_player(fide_id: Optional[str], name: Optional[str]) -> bool:
    """Return whether a player is eligible to count in GP rankings."""
    normalized_fide_id = str(fide_id).strip() if fide_id else ""
    if normalized_fide_id in INELIGIBLE_GP_PLAYER_FIDE_IDS:
        return False

    return _normalize_name(name) not in INELIGIBLE_GP_PLAYER_NAMES
