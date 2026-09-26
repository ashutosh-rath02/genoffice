#!/bin/sh
# deb/rpm post-remove: drop the threadnoteoffice symlink only on a real uninstall.
# rpm runs the old package's %postun after the new %post during an upgrade
# (with $1 = 1); deb passes "upgrade" there. Removing then would kill the
# link the new version just created.
case "$1" in
  0|remove|purge) ;;
  *) exit 0 ;;
esac
if [ -L /usr/bin/threadnoteoffice ] && [ "$(readlink /usr/bin/threadnoteoffice)" = "/opt/ThreadnoteOffice/resources/cli/threadnoteoffice" ]; then
  rm -f /usr/bin/threadnoteoffice
fi
exit 0
