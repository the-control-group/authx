#!/bin/bash

for p in $(echo "scopes
authx
$(ls packages | grep -v scopes | grep -v authx)" | sed 's/^/packages\//'); do
  echo "

---------- $p" && if ! (cd $p && exec $@); then exit 1; fi
done