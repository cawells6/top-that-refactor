#!/bin/bash
# Kill all node and vite processes (Windows version, for bash shells)
taskkill //F //IM node.exe 2> /dev/null
# Vite usually runs as node.exe, but if you ever see vite.exe, uncomment below:
# taskkill //F //IM vite.exe 2> /dev/null
npm run dev:all
