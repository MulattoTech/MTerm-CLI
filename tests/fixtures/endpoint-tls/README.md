# Public synthetic TLS fixture

This self-signed localhost certificate and its deliberately public test key were
generated solely for the endpoint inspector regression on 2026-11-12. They are
not an account credential, production identity, or trust root for the product.
The test listens only on an owned loopback ephemeral port, exercises the actual
inspection agent, and destroys all owned sockets. These fixtures are excluded
from the installed package. No remote endpoint or real credential is used.
