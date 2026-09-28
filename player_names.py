"""Player name cleanup and "Surname, Given names" formatting.

Arbiters type names into Swiss-Manager in any order, so the surname is inferred:
an English (or other clearly given) name is a given name, and a Kenyan-sounding
name next to it is the surname. This is a best guess, not a certainty.
"""

import re
from typing import List, Optional

GIVEN_NAMES = frozenset(
    """
    aadith abby abdi abdillah abdulahi abednego abel abigael abigaelle abigail abiola abraham abrianna
    ace achilles adiel adrian adriel agape agata aggrey agnes ahmed aiden akram albert albright aldo
    alex alexander alexis alfonse alfred alice allan allen alpha alton alvin amanda amin amos andericus
    andre andrew andy angel angela angelique ann annabel anne annety annuarite anoushka anthony apollo
    archie arianne ariela ariella arlene armon arnold arshavin arthur asaph aseem ashford ashley atarah
    aurelia austin austine ava aviah avriel avyana ayden aymaan ayub azariah azzline
    bakhita balqis barack barrack batista beatrice bella bellamy belyse ben benard benford benjamin
    benson bernard bernice berry bethsy bildad bill billy bjorn blair blessing blessings bliss bonface
    boniface boston bradley bramuel brandon brandy bravely bravin bravine brayan brayden breetalizah
    brenda brian brianna bridget bridgit brighton britta brittney bruce bryan
    caleb calton calvince calvins caren carlos carlson caroline carson cassidy cate catherine cecilia
    chanel chantelle charity charles cherish cherry chris chrisphinus chrispine christian christie
    christine christophe christopher cindy clarence claude clement cleopas clifford cliffton clinton
    collins concillia cornelius cosmas courage courson curtis cynthia cyprian
    daanish dadson daisy damascene damien dan dancan dancun danford daniel dankaiser danson danstan
    danstone daphne darleen darrell darrien daudi dave david davidson davis dean deborah declan della
    delmas delvie denis dennis derick derrick derry desmunt dexter dhruv diana dickson dior dominic
    donald dorcas dorris douglas duke duncan durga dylan
    earl ebba edith edna edwin eli eliakim eliana elias elijah elisha eliud elizabeth ella elly elphace
    elsie elvin elvira elvis ely elyse emily emma emmaculate emmanuel enock enson ephrahim eric erica
    erick ernest esley esther ethan ether eugene evans evon excellent ezekiel ezra
    fabian fabrice fadhila faith fanuel farhiya fathima faustine favor favour felix festus fidel
    fidelia finey finney flavius floyd francis francisca franck franco frank franklin frankline fred
    fredrick fuad
    gabi gabriel gabrielle gaetano gaius gavin gavril gene genevieve geoffrey george georgina georginah
    gerald getrude gian gianni gibson gideon gift gilbert gillian gisele givans given gladys glen glenda
    gloria godfrey godluck godwil grace gracylyne greg gregory grennah griffins
    habiba hadassah haden hamisi harold harris harrison harry harun hazel helen henry hera herman
    hesham hezekiah hezron hillary hiram hope hubert hugh humphrey hunter hyacinth
    ian ibrahim ignatious ignitious iman innocent inocent irene irwin isaac isabel isabella isaiah
    isaya ismael ismail israel issa ivan ivy
    jabez jacinta jackim jackline jackson jacob jadiel jadon jairoh jairus jamal jamar james jamie
    jamila janai janet japheth jared jasmine jason jawahir jayden jaylah jayson jean jean-christophe
    jecinta jeff jeffy jemmy jenny jeremiah jeremy jermain jermaine jerry jeshurun jesicah jesse jesus
    jether jewel jibril jimmy job joe joel john johnpaul jokhim jon jonathan jose joseph josephat
    joshua josiah josphat joy joyce joyline jude judy julia julie juliet julius jully junior justa
    justin
    kacey karan karel karen kate katie kavyaraj kayden kayla kaylan kaylee kayleen keira keisha keith
    kelly kelvin kendrick kennedy kennet kenneth kentwilliam kerry kevin keycie khalid khushi kiara
    kieran kim kimberly king krystal kwame kylan kyle
    lance laris laurecia lauryn lavin lawrence lee lemuel lenny lenon lenox leo leon leonard leron
    leroy lester leticia levi levin lewis liam lilian lily lincoln linda lingston linsky liora lisa
    louis louise lucas luciah lucy lucyvillian luke lydia lyn lyndah lynn lyron
    madhav malachi malaki manuel marc-antoine marcarius marcelar marcellinus marco marcus maria
    marianne mario marion mark martha martin marvin mary master mathew matthew matthias maureen
    maurice maurine mavric max maxmillian maxwell maya maysie mckenzie medwin mehul melanie melany
    melissa melivin melvin merceline mercelino mercy meshack micah mich michael michelle mike milan
    millicent miranda mirelle miriam mirriam misheck mitchel mitchelle mohamed mohammed mohamud monica
    morgan morris moses musa myles
    naima nandini naomi natalie natasha nathan nathaniel nehemiah nelson nelvin neriah nesta neville
    nevin newton nic-ayden nicholas nicodemus nicole nigel nikisha nils nisha nishchal noah noel noella
    norah noreen norman nurah
    obadia obadiah obed obede oliver olivia omar onesmus oscar owen
    pamela pascal pat-leo patience patricia patrick paul pauline peace penina peris pete peter
    petronilla philip phillip phyllis pius polycarp praise precious prince princewill priscah
    priscillah prudence purity
    quinton
    racheal ralph ramathan ramsey rania raphael raymond rayna raynold reagan rebecca reign remi remiel
    rene renee rennox renold reuben reuel rhoda richard ricky rishaan rishan rishit rita robert robin
    robinson rochelle rocky rodrick ronald ronny rose roy royford rudolf rudra ruhan rusheel ruth ryan
    ryanhill rylan
    sabrina sadam sadiq sajid salim salma samantha samara samir sammy samson samuel sandra sanford
    sarthak sasha sean selah sellastine semira shadrack shakirah shalom shammah shanice shanie shannon
    shantel sharlene sharon shawn shayne sheila sheilrayn sheilryan shelmith shem sheryll shirley
    shirlyn shukri silvanus silvia simon skylar solomon sophia stacy staisy stanley starford stefan
    stella stephan stephanie stephen steve suleiman susan syliviah sylvia symon
    tabitha talia tamar tamara tasha ted tedy telvin terence teresa teresiah terrence terri thomas
    tiffan tim timna timothy titus tlevis tom tonny tracy travis trevis trevor triumph trizah tyra tyron
    urbanus
    valarie valentino valeria valma vanessa vaniah vansh vasanth veronica veronicah viacheslav vianney
    vicglenn victor victoria vihaan vincent vishal vitalis vivian vivica
    walter washington wayne wesley will william wilson winfred winnie winston wisley witness wycliff
    wycliffe
    yajush yash yasmin yussuf yvette yvonne
    zablon zachary zadock zahra zakaria zakariya zamar zane zeke zena zhanna zidan zion zipporah zoe
    zulfikaar zulfikar
    ahadi amani bahati baraka faraja hekima imani jabali jasiri neema pendo riziki sifa tumaini wema
    zawadi zuri zurie
    awadh eglar elikaseed glain hawi hitansh ivril jabu jacksletter jaycrack jeegar jian kabbis
    miron mohameddeq mohin nazarene nicklick praxidis raila ravjoel robernal rovers severn shafi
    shariff tendai
    """.split()
)

# Initials and suffixes carry no surname signal and stay among the given names.
_NEUTRAL_TOKENS = frozenset({"jnr", "snr", "jr", "sr"})


def clean_player_name(name: str) -> str:
    """Tidy arbiter-entered punctuation and spacing without reordering words."""
    name = name.replace("\u2019", "'")
    name = re.sub(r"-\s+", "-", name)
    name = re.sub(r"\s*,\s*", ", ", name)
    name = re.sub(r"\s+", " ", name)
    # A trailing period on a full word is a typo; on an initial it's intentional.
    name = re.sub(r"(\w{2,})\.(?=\s|,|$)", r"\1", name)
    words = [w[0].upper() + w[1:] if w.islower() else w for w in name.split(" ")]
    return " ".join(words).strip(" ,")


def player_name_key(name: str) -> str:
    """Order- and punctuation-insensitive key, so 'Omondi, Wesley' matches 'Wesley Omondi'."""
    return " ".join(sorted(re.findall(r"[^\W_]+", name.lower())))


def _is_given(token: str) -> bool:
    return token.lower() in GIVEN_NAMES


def _is_neutral(token: str) -> bool:
    bare = token.rstrip(".").lower()
    return len(bare) == 1 or bare in _NEUTRAL_TOKENS


def _surname_index(tokens: List[str]) -> int:
    """Guess which of the words in typed order is the surname."""
    signal = [i for i, t in enumerate(tokens) if not _is_neutral(t)]
    given = [i for i in signal if _is_given(tokens[i])]
    other = [i for i in signal if not _is_given(tokens[i])]
    if given and other:
        # The first English name marks where the given names begin: typed
        # "Otieno George Ochieng" is surname-first, "George Ochieng Otieno" is
        # given-first with the surname last.
        return other[0] if other[0] < given[0] else other[-1]
    return signal[-1] if signal else len(tokens) - 1


def format_player_name(name: str, reference: Optional[str] = None) -> str:
    """Return a cleaned name as "Surname, Given names".

    An existing comma is trusted unless it plainly splits a given name from the
    surname the wrong way round (e.g. "Alexander, Muriithi"). `reference` is an
    alternative spelling of the same name, such as the player's FIDE record,
    whose comma is used when `name` has none.
    """
    name = clean_player_name(name)
    source = name
    if "," not in name and reference:
        reference = clean_player_name(reference)
        if "," in reference and player_name_key(reference) == player_name_key(name):
            source = reference

    if "," in source:
        surname_part, _, given_part = source.partition(",")
        surname_words, given_words = surname_part.split(), given_part.split()
        surname_all_given = all(_is_given(t) or _is_neutral(t) for t in surname_words)
        given_has_other = any(not _is_given(t) and not _is_neutral(t) for t in given_words)
        if surname_words and given_words and not (surname_all_given and given_has_other):
            return f"{' '.join(surname_words)}, {' '.join(given_words)}"
        tokens = surname_words + given_words
    else:
        tokens = source.split()

    if len(tokens) < 2:
        return " ".join(tokens)
    i = _surname_index(tokens)
    return f"{tokens[i]}, {' '.join(tokens[:i] + tokens[i + 1:])}"
