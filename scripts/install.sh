while true; do
    # Check if the current and previous package-lock.json are the same
    if ( [ -f /var/tmp/authx-init/installer-complete ] && cmp -s ./package-lock.json /var/tmp/authx-init/installer-complete ); then
        echo "No changes detected in package-lock.json; sleeping..."
        sleep 10
        continue
    fi

    # Install dependencies and copy the new package-lock.json
    echo "Changes detected in package-lock.json; installing packages..."
    rm -f /var/tmp/authx-init/installer-complete
    npm ci && cp package-lock.json /var/tmp/authx-init/installer-complete
    sleep 10
done
