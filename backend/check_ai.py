"""Deployment smoke test: no user messages, profiles or secrets are printed."""
import os
import sys
import json
from pathlib import Path
from openai import OpenAI
from library_matching import match_reading
from chat_routes import public_document, build_system_prompt

def main():
    sample = {"_id": "test-id", "content": "synthetic test"}
    public = public_document(sample)
    assert public["id"] == public["_id"] == "test-id"
    assert "id" not in sample
    prompt = build_system_prompt({}, "en")
    assert "100-150 words" in prompt and "cannot diagnose" in prompt
    print("Chat identifier contract and concise safety prompt checks passed.")
    catalogue = json.loads((Path(__file__).parent / "library.json").read_text(encoding="utf-8"))
    assert match_reading("Where can I learn about asthma?", catalogue)[0]["id"] == "nhs-asthma"
    assert match_reading("Co mogę przeczytać o astmie?", catalogue)[0]["id"] == "nhs-asthma"
    assert match_reading("hello unrelatedxyz", catalogue) == []
    assert match_reading("stomach pain", catalogue) == []
    assert len(match_reading("asthma diabetes first aid depression", catalogue)) <= 3
    print("Library metadata matching checks passed.")
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        print("AI smoke test failed: GROQ_API_KEY is not configured.")
        return 1
    model = "openai/gpt-oss-120b"
    try:
        client = OpenAI(api_key=key, base_url="https://api.groq.com/openai/v1", timeout=45)
        response = client.chat.completions.create(
            model=model, messages=[{"role": "user", "content": "Reply with the word OK."}],
            max_tokens=1024, reasoning_effort="low")
        if not response.choices[0].message.content:
            print("AI smoke test failed: empty answer.")
            return 1
        print(f"AI smoke test passed: {model} returned a non-empty answer.")
        return 0
    except Exception as exc:
        print(f"AI smoke test failed: {type(exc).__name__}, status={getattr(exc, 'status_code', 'unavailable')}.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
