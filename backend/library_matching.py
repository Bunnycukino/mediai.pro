"""Metadata matching only; no article retrieval or clinical assessment."""
import re
import unicodedata

STOP_WORDS = set("a an and are as at be can do for from have how i in is it me my of on or please the to what when where with you about information learn czy co jak jest mam mnie moje o na nie i w z ze prosze objawy symptoms health medical".split())
STOP_WORDS.update("pain bol blood first help care treatment illness disease education medical medicine doctor pomoc leczenie lekarz choroba zdrowie".split())


def tokens(text):
    plain = unicodedata.normalize("NFKD", text.casefold().replace("ł", "l"))
    plain = "".join(char for char in plain if not unicodedata.combining(char))
    return set(re.findall(r"[a-z0-9]+", plain)) - STOP_WORDS


def match_reading(message, catalogue, limit=3):
    query = tokens(message)
    if not query:
        return []
    ranked = []
    for item in catalogue:
        terms = tokens(item["title"] + " " + item.get("tags", ""))
        score = sum(any(word == term or (len(word) >= 4 and len(term) >= 4 and
                    word[:4] == term[:4]) for term in terms) for word in query)
        if score:
            ranked.append((score, item))
    ranked.sort(key=lambda pair: pair[0], reverse=True)
    return [{"id": item["id"], "title": item["title"], "publisher": item["publisher"],
             "url": item["url"], "description": item["description"],
             "scope": "link_metadata_only"} for _, item in ranked[:max(0, min(limit, 3))]]
