#!/usr/bin/env python3
# Copyright (C) 2023 Red Hat, Inc.
# SPDX-License-Identifier: LGPL-2.1-or-later

import sys
from random import SystemRandom as sr

try:
    import crypt_r # type: ignore[import]
except ImportError:
    try:
        import crypt as crypt_r
    except ImportError:
        sys.stderr.write("Missing crypt_r library\n")
        sys.exit(1)
except Exception as e:
    sys.stderr.write("Missing crypt_r library\n")
    sys.exit(1)

# Using the function from pyanaconda/core/users.py
def crypt_password(password):
    """Crypt a password.

    Process a password with appropriate salted one-way algorithm.

    :param str password: password to be crypted
    :returns: crypted representation of the original password
    :rtype: str
    """
    # yescrypt is not supported by Python's crypt module,
    # so we need to generate the setting ourselves
    b64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    setting = "$y$j9T$" + "".join(sr().choice(b64) for _sc in range(24))

    # and try to compute the password hash using our yescrypt setting
    try:
        cryptpw = crypt_r.crypt(password, setting)

    # Fallback to sha512crypt, if yescrypt is not supported
    except OSError:
        sys.stderr.write("yescrypt is not supported, falling back to sha512crypt\n")
        try:
            cryptpw = crypt_r.crypt(password, crypt_r.METHOD_SHA512)
        except OSError as exc:
            raise RuntimeError(
                f"Unable to encrypt password: unsupported algorithm {crypt_r.METHOD_SHA512}"
            ) from exc
    
    print(cryptpw)
    return cryptpw

def main() -> None:
    args = sys.argv[1:]

    if len(args) < 1:
        sys.stderr.write("Usage: encrypt-user-pw.py <password>\n")
        sys.exit(1)
    elif len(args) == 1:
        try:
            crypt_password(args[1])
        except Exception as exc:
            sys.stderr.write(f"Error: {exc}\n")
            sys.exit(1)
    else:
        sys.stderr.write("Error: expected exactly one argument (the password)\n")
        sys.exit(1)
    
if __name__ == "__main__":
    main()
