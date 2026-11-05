import base64
import concurrent.futures
import hashlib
import json
import os
import re
import subprocess
import urllib.request
from pathlib import Path

import yaml


def main():
    version = os.environ["RELEASE_VERSION"].removeprefix("v")
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", version):
        raise ValueError("Invalid release version")
    repository = os.environ["RELEASE_REPO"]
    tag = "v" + version
    release = json.loads(subprocess.check_output([
        "gh", "release", "view", tag, "--repo", repository,
        "--json", "assets,isDraft,tagName,url",
    ]))
    if release["isDraft"] or release["tagName"] != tag:
        raise ValueError("Expected a published release with the requested tag")
    assets = {asset["name"]: asset for asset in release["assets"]}
    files = {}
    for name in ["latest.yml", "latest-mac.yml", "latest-linux.yml"]:
        metadata = yaml.safe_load(subprocess.check_output([
            "gh", "release", "download", tag, "--repo", repository,
            "--pattern", name, "--output", "-",
        ]))
        if str(metadata["version"]) != version or not metadata["files"]:
            raise ValueError(f"{name}: wrong version or empty file list")
        for entry in metadata["files"]:
            filename = entry["url"]
            if Path(filename).name != filename or version not in filename:
                raise ValueError(f"{name}: unexpected package filename")
            asset = assets[filename]
            if not entry.get("sha512") or asset["size"] != entry["size"]:
                raise ValueError(f"{filename}: missing checksum or asset size mismatch")
            if filename.endswith((".exe", ".zip", ".dmg")) and filename + ".blockmap" not in assets:
                raise ValueError(f"{filename}: missing blockmap")
            if filename in files and files[filename]["sha512"] != entry["sha512"]:
                raise ValueError(f"{filename}: conflicting metadata checksums")
            files[filename] = {**entry, "downloadURL": asset["url"]}

    def verify(entry):
        digest = hashlib.sha512()
        size = 0
        with urllib.request.urlopen(entry["downloadURL"], timeout=120) as response:
            for chunk in iter(lambda: response.read(1024 * 1024), b""):
                size += len(chunk)
                digest.update(chunk)
        if size != entry["size"]:
            raise ValueError(f"{entry['url']}: downloaded size mismatch")
        if base64.b64encode(digest.digest()).decode() != entry["sha512"]:
            raise ValueError(f"{entry['url']}: SHA-512 mismatch")
        result = {"file": entry["url"], "size": size, "sha512": "verified", "url": entry["downloadURL"]}
        print(json.dumps(result), flush=True)
        return result

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(verify, files.values()))
    report = {"version": version, "release": release["url"], "packages": results}
    Path("release-verification.json").write_text(json.dumps(report, indent=2) + "\n")
    print(f"VERIFIED {len(results)} packages; package files were not saved", flush=True)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
            summary.write(f"### {tag}: {len(results)} packages verified\n\n")
            summary.write("All published metadata versions, asset sizes, blockmap presence and full package SHA-512 checks passed.\n")
            summary.write("This checks published downloads; it does not establish native installation or workspace restoration.\n")


if __name__ == "__main__":
    main()
