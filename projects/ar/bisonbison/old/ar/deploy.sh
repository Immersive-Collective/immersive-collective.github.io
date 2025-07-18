#!/bin/sh

cd /Users/smielniczuk/Documents/works/ar-tests/ &&
rsync -av -e "ssh -p 18021" --exclude='*.map' --exclude='*.blend*' --exclude='.DS_Store' /Users/smielniczuk/Documents/works/ar-tests/ root@workwork.fun:/var/www/workwork.fun/ar

