#!/bin/sh
# deb/rpm post-install: expose the threadnoteoffice command line shipped inside the app.
set -e
launcher="/opt/ThreadnoteOffice/resources/cli/threadnoteoffice"
if [ -x "$launcher" ]; then
  ln -sf "$launcher" /usr/bin/threadnoteoffice
fi
exit 0
