#!/usr/bin/python3
"""Narrow Paperclip 2026.1023.0 merged-/usr compatibility wrapper.

Only the four top-level aliases are adjusted. All other mount, namespace,
network, environment and child-command arguments are preserved. No argv logging.
"""
import os
import sys

ALIASES = frozenset(('/bin', '/sbin', '/lib', '/lib64'))


def adjusted_arguments(arguments):
    delimiter = arguments.index('--') if '--' in arguments else len(arguments)
    prefix, child = arguments[:delimiter], arguments[delimiter:]
    aliases = {}
    i = 0
    while i < len(prefix):
        if prefix[i] == '--symlink' and i + 2 < len(prefix) and prefix[i + 2] in ALIASES:
            alias = prefix[i + 2]
            if alias in aliases or not os.path.islink(alias):
                raise ValueError('unexpected system alias layout')
            canonical = os.path.realpath(alias)
            if not canonical.startswith('/usr/') or not os.path.isdir(canonical):
                raise ValueError('system alias must resolve to a directory inside /usr')
            aliases[alias] = os.path.relpath(canonical, '/')
            i += 3
        else:
            i += 1
    if not aliases:
        return arguments[:]
    if set(aliases) != ALIASES:
        raise ValueError('unexpected partial Paperclip alias layout')
    if not any(prefix[i:i + 3] == ['--ro-bind', '/usr', '/usr'] for i in range(len(prefix))):
        raise ValueError('read-only /usr mount required')
    result = []
    i = 0
    while i < len(prefix):
        triple = prefix[i:i + 3]
        if len(triple) == 3 and triple[0] == '--symlink' and triple[2] in aliases:
            result.extend(['--symlink', aliases[triple[2]], triple[2]])
            i += 3
        elif (len(triple) == 3 and triple[0] == '--ro-bind'
              and triple[1] == triple[2] and triple[1] in aliases):
            # /usr is already mounted read-only; the alias reaches that mount.
            i += 3
        else:
            result.append(prefix[i])
            i += 1
    return result + child


if __name__ == '__main__':
    try:
        argv = adjusted_arguments(sys.argv[1:])
    except ValueError:
        print('paperclip-bwrap-compat: unsupported mount layout; refusing launch', file=sys.stderr)
        sys.exit(125)
    os.execv('/usr/bin/bwrap', ['/usr/bin/bwrap', *argv])
