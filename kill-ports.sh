#!/bin/bash

# Kill all processes running on ports 3000-3010

echo "Killing processes on ports 3000-3010..."

for port in {3000..3010}; do
    pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "Killing process $pid on port $port"
        kill -9 $pid
    fi
done

echo "Done!"
