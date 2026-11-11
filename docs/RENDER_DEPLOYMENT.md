# Render deployment

See [OPERATIONS.md](OPERATIONS.md#render) for the current testnet configuration, required environment variables, authentication callbacks and verification steps.

The earlier port-scan timeout came from a development process bound to localhost. The server now detects Render, uses its PORT and binds 0.0.0.0. Public services use connected mode; development identities remain local only. The current Blueprint enables real testnet settlement, isolated guest entry and HTTPS persistence without embedding secrets.

The free plan may sleep. No remote deployment or guaranteed uptime is claimed; the owner must approve publication and supply the actual service URL/account access. Keep the demo available through November 18, ideally November 25.
