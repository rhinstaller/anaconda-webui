import sys
from random import SystemRandom as sr

import crypt_r  # type: ignore[import]


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

    return cryptpw


try:
    print(crypt_password(sys.argv[1]), end="")
except Exception as e:
    sys.stderr.write(str(e) + "\n")
    sys.exit(1)
