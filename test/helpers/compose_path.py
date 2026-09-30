#!/usr/bin/env python3

import argparse
import json
import re
import sys
import urllib.error
import urllib.request


def get_compose_url(compose_id):
    """Determine the correct compose base URL with fallback.

    Args:
        compose_id (str): The compose ID (e.g., 'Fedora-44-20260422.1', 'latest-Fedora-44')

    Returns:
        dict: A dictionary containing:
            - compose_id (str): Input compose ID unchanged.
            - url (str): Resolved base URL. (printed as plain string without --json)
            - release_path (str): Used Koji path segment (e.g., '44', 'rawhide', 'branched').
            - used_fallback (bool): True if primary URL failed and fallback was used.
            
            Note: Passed to json.dumps() when --json flag is set."""
    # Determine the release path based on compose ID pattern
    release = "branched"  # Default release path
    fallback_release=None
    if match := re.match(r'^(latest-)?Fedora-Rawhide', compose_id):
        # Rawhide compose -> try rawhide first, then branched
        release = "rawhide"
        fallback_release = "branched"
    elif match := re.match(r'^(latest-)?Fedora-([0-9]+)', compose_id):
        # Fedora versioned (e.g., Fedora-43-20250819.n.0) -> try versioned first, then branched
        release = match.group(2)
        fallback_release = "branched"

    # For actual compose IDs, return path with /compose/ (for compose access)
    primary_url = f"https://kojipkgs.fedoraproject.org/compose/{release}/{compose_id}"

    try:
        urllib.request.urlopen(primary_url, timeout=30)
        return {
            "compose_id": compose_id,
            "url": primary_url,
            "release_path": release,
            "used_fallback": False}
    except (urllib.error.HTTPError, urllib.error.URLError) as e:
        if not fallback_release:
            raise e

        # Fall back to the other path
        fallback_url = f"https://kojipkgs.fedoraproject.org/compose/{fallback_release}/{compose_id}/"
        urllib.request.urlopen(fallback_url, timeout = 30)
        return {
            "compose_id": compose_id,
            "url": fallback_url,
            "release_path": fallback_release,
            "used_fallback": True}

def main():
    """Command line interface for the script."""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--json",
        action="store_true")
    parser.add_argument(
        "compose_id",
        nargs="?")
    args, unknown = parser.parse_known_args()
    if unknown or not args.compose_id:
        parser.print_usage(sys.stderr)
        sys.exit(1)
    try:
        result = get_compose_url(args.compose_id)
    except Exception as e:
        sys.stderr.write(f"Error: {e}\n")
        sys.exit(1)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(result["url"])

if __name__ == "__main__":
    main()
