import importlib.util
import pathlib
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('compat', pathlib.Path(__file__).with_name('paperclip-bwrap-compat.py'))
compat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compat)


class WrapperContract(unittest.TestCase):
    def arguments(self):
        args = ['--die-with-parent', '--tmpfs', '/']
        for name in ('bin', 'sbin', 'lib', 'lib64'):
            args += ['--symlink', 'usr/' + name, '/' + name]
        for name in ('bin', 'sbin', 'usr', 'lib', 'lib64'):
            args += ['--ro-bind', '/' + name, '/' + name]
        return args

    def test_preserves_sensitive_mounts_flags_and_child_argv(self):
        suffix = ['--ro-bind', '/etc/resolv.conf', '/etc/resolv.conf',
                  '--ro-bind', '/etc/localtime', '/etc/localtime',
                  '--bind', '/synthetic/workspace', '/synthetic/workspace',
                  '--unshare-net', '--unshare-pid', '--', '/usr/bin/python3',
                  '--ro-bind', '/bin', '/bin']
        result = compat.adjusted_arguments(self.arguments() + suffix)
        self.assertEqual(result[-len(suffix):], suffix)
        for alias in compat.ALIASES:
            index = result.index(alias)
            self.assertEqual(result[index - 2:index], ['--symlink', compat.os.path.relpath(compat.os.path.realpath(alias), '/')])
        self.assertIn('/usr', result)

    def test_refuses_missing_usr_mount(self):
        args = self.arguments()
        i = args.index('/usr') - 1
        del args[i:i + 3]
        with self.assertRaises(ValueError):
            compat.adjusted_arguments(args)

    def test_unrelated_invocation_unchanged(self):
        args = ['--unshare-net', '--', '/bin/true']
        self.assertEqual(compat.adjusted_arguments(args), args)

    def test_refuses_alias_outside_usr(self):
        with patch.object(compat.os.path, 'realpath', return_value='/private/other'):
            with self.assertRaises(ValueError):
                compat.adjusted_arguments(self.arguments())

    def test_refuses_partial_alias_layout(self):
        with self.assertRaises(ValueError):
            compat.adjusted_arguments(['--symlink', 'usr/bin', '/bin', '--ro-bind', '/usr', '/usr'])


if __name__ == '__main__':
    unittest.main()
