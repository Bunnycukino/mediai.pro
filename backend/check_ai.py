"""Deployment smoke test: no user messages, profiles or secrets are printed."""
import os
import sys
from openai import OpenAI

def main():
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
