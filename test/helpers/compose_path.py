#!/usr/bin/env python3

import re
import sys
import urllib.error
import urllib.request


def get_compose_url(compose_id):
    """
    Determine the correct compose base URL with fallback.

    Args:
        compose_id (str): The compose ID (e.g., 'Fedora-43-20250819.n.0', 'Fedora-Rawhide-20250819.n.0', 'latest-Fedora-43', 'latest-Fedora-Rawhide')

    Returns:
        str: The correct compose base URL
    """
    # Determine the release path based on compose ID pattern
    release = "branched"  # Default release path
    if re.match(r'^(latest-)Fedora-([0-9]+)$', compose_id):
        # Fedora versioned (e.g., latest-Fedora-43) -> try branched first, then numbered
        match = re.match(r'.*Fedora-([0-9]+)$', compose_id)
        version = match.group(1)
        release = version
        fallback_release = "branched"
    elif re.match(r'^(latest-)?Fedora-Rawhide', compose_id):
        # Rawhide compose (with or without latest-) -> try rawhide first, then branched
        release = "rawhide"

    # For actual compose IDs, return path with /compose/ (for compose access)
    primary_url = f"https://kojipkgs.fedoraproject.org/compose/{release}/{compose_id}"

    try:
        urllib.request.urlopen(primary_url)
        return primary_url
    except urllib.error.HTTPError as e:
        if not fallback_release:
            raise e

        # Fall back to the other path
        fallback_url = f"https://kojipkgs.fedoraproject.org/compose/{fallback_release}/{compose_id}/"
        urllib.request.urlopen(fallback_url)
        return fallback_url

def main():
    """Command line interface for the script."""
    if len(sys.argv) != 2:
        print("Usage: compose_path.py <compose_id>")
        print("Returns: The correct compose base URL")
        sys.exit(1)

    compose_id = sys.argv[1]
    result = get_compose_url(compose_id)
    print(result)

if __name__ == "__main__":
    main()
