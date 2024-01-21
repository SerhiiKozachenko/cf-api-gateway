# Cloudflare API Gateway

### Dev notes:

Create Cloudflare Worker KV store

`wrangler kv:namespace create <YOUR_NAMESPACE> --preview`

Add bindings for created KV in wrangler.toml

When running locally using `wrangler dev` a local kv store used.

To run locally and connect to preview KV store use `wrangler dev --remote`
