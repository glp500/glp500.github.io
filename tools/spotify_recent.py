"""Refresh _data/listening.json from Spotify.

Run by .github/workflows/listening.yml on a schedule. Credentials come from
repository secrets and never reach the built site: the workflow commits a small
JSON file, and the page renders from that. Visitors' browsers never contact
Spotify, so there is no third-party request and no token in the page source.

Needs three secrets, see the setup notes in that workflow:
    SPOTIFY_CLIENT_ID
    SPOTIFY_CLIENT_SECRET
    SPOTIFY_REFRESH_TOKEN

Writes an empty list rather than failing the build if Spotify is unreachable,
so a flaky API never blocks a deploy.
"""
import base64
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

TOKEN_URL = "https://accounts.spotify.com/api/token"
RECENT_URL = "https://api.spotify.com/v1/me/player/recently-played?limit=8"
OUT = pathlib.Path("_data/listening.json")
LIMIT = 6


def post(url, data, headers):
    request = urllib.request.Request(
        url, data=urllib.parse.urlencode(data).encode(), headers=headers
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def get(url, token):
    request = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def access_token(client_id, client_secret, refresh_token):
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    payload = post(
        TOKEN_URL,
        {"grant_type": "refresh_token", "refresh_token": refresh_token},
        {"Authorization": f"Basic {basic}",
         "Content-Type": "application/x-www-form-urlencoded"},
    )
    return payload["access_token"]


def main():
    client_id = os.environ.get("SPOTIFY_CLIENT_ID")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET")
    refresh_token = os.environ.get("SPOTIFY_REFRESH_TOKEN")
    if not (client_id and client_secret and refresh_token):
        print("spotify credentials missing; leaving the existing file alone")
        return 0

    try:
        token = access_token(client_id, client_secret, refresh_token)
        payload = get(RECENT_URL, token)
    except (urllib.error.URLError, KeyError, TimeoutError) as error:
        print(f"spotify unreachable ({error}); leaving the existing file alone")
        return 0

    tracks, seen = [], set()
    for item in payload.get("items", []):
        track = item.get("track") or {}
        name = track.get("name")
        artists = ", ".join(a["name"] for a in track.get("artists", []) if a.get("name"))
        if not name or (name, artists) in seen:
            continue
        seen.add((name, artists))
        tracks.append({
            "title": name,
            "artist": artists,
            "url": track.get("external_urls", {}).get("spotify", ""),
            "played_at": item.get("played_at", ""),
        })
        if len(tracks) == LIMIT:
            break

    OUT.write_text(json.dumps(
        {"updated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
         "tracks": tracks},
        indent=2) + "\n")
    print(f"wrote {len(tracks)} tracks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
