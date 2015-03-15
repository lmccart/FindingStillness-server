#!/bin/bash

# make sure that the logs/ directory exists or this won't work
cd /Users/stillness/Documents/FindingStillness-server
/usr/local/bin/forever start -o logs/out.log -e logs/err.log --spinSleepTime 1000 --minUptime 5000 server.js