while true; do
    # Check if the current and previous package-lock.json are the same
    if ( [ -f /tmp/package-lock.json ] && cmp -s ./package-lock.json /tmp/package-lock.json ); then
        echo "No changes detected in package-lock.json; sleeping..."
        sleep 10
        continue
    fi

    # Install dependencies and copy the new package-lock.json
    echo "Changes detected in package-lock.json; installing packages..."
    rm -f /tmp/package-lock.json
    npm install --package-lock-only && cp package-lock.json /tmp/package-lock.json
    sleep 10
done
