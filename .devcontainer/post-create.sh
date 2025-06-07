#!/bin/bash
set -e

# Install SSH server, can be used for codespaces, remote development, etc.
apt-get update && apt-get install -y openssh-server