#!/usr/bin/env python3

import sys

from wikitcms.wiki import Wiki  # type: ignore[import-untyped]


def get_current_compose_id():
    """
    Get the current event compose ID from the Fedora wiki.

    Returns:
        str: The compose ID (e.g., 'Fedora-43-20250910.2')
    """
    site = Wiki()
    event = site.current_event
    images = event.ff_release_images
    return images.cid


def main():
    """Command line interface for the script."""
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help']:
        print("Usage: get_current_compose.py")
        print("Returns: The current event compose ID from the Fedora wiki")
        sys.exit(0)

    try:
        compose_id = get_current_compose_id()
        print(compose_id)
    except Exception as e:
        print(f"Error getting current compose ID: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
